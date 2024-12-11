let now_playing = document.querySelector('.now-playing');
let track_art = document.querySelector('.track-art');
let track_name = document.querySelector('.track-name');
let track_artist = document.querySelector('.track-artist');

let playpause_btn = document.querySelector('.playpause-track');
let next_btn = document.querySelector('.next-track');
let prev_btn = document.querySelector('.prev-track');

let seek_slider = document.querySelector('.seek_slider');
let volume_slider = document.querySelector('.volume_slider');
let volume_icon = document.querySelector('.volume-icon');
let curr_time = document.querySelector('.current-time');
let total_duration = document.querySelector('.total-duration');
let randomIcon = document.querySelector('.fa-random');
let curr_track = document.createElement('audio');

let track_index = 0;
let isPlaying = false;
let isRandom = false;
let isRepeat = false;
let updateTimer;
let music_list;

const apiUrl = "http://informatica.iesalbarregas.com:7008";
const filtros = document.getElementById("filter");

// Evento con una función para filtrar las canciones de la lista. Si seleccionamos todas,
// se les da la clase show, mientras que si seleccionamos favoritas, se les da la clase hide a
// las canciones que no sean favoritas.
filtros.addEventListener("change", function () {
    const selectedFilter = filtros.value;

    if (selectedFilter === "todas") {
        $('.playlist-item').show();
    } else if (selectedFilter === "favoritas") {
        $('.playlist-item').each(function () {
           if(!$(this).find('i').hasClass('active')) {  
                $(this).hide();
            }
        });
    }
});

fetchSongs();

// Función con la que enviaremos las canciones desde el formulario, también a su vez contiene los regex 
// que manejarán las validaciones de los campos. Si está todo correcto, se envía la canción a la función
// uploadSong, se limpia el contenido del modal y se cierra.
function submitSong(event) {
    event.preventDefault();

    clearErrors();

    const musicInput = document.getElementById("music");
    const titleInput = document.getElementById("title");
    const artistInput = document.getElementById("artist");
    const coverInput = document.getElementById("cover");

    let isValid = true;

    if (!musicInput.files[0] || !musicInput.files[0].name.endsWith(".mp3")) {
        showError(musicInput, "El archivo debe ser un MP3 válido.");
        isValid = false;
    }

    if (titleInput.value.length > 20) {
        showError(titleInput, "El título no puede exceder los 20 caracteres.");
        isValid = false;
    } else {
        const titleRegex = /^[a-zA-Z\s,\.]+$/;
        if (!titleRegex.test(titleInput.value)) {
            showError(
                titleInput,
                "El título sólo puede contener letras, espacios, comas y puntos."
            );
            isValid = false;
        }
    }

    if (artistInput.value.length > 20) {
        showError(artistInput, "El nombre del artista no puede exceder los 20 caracteres.");
        isValid = false;
    } else {
        const artistRegex = /^[a-zA-Z\s]+$/;
        if (!artistRegex.test(artistInput.value)) {
            showError(artistInput, "El nombre del artista sólo puede contener letras y espacios.");
            isValid = false;
        }
    }

    if (
        !coverInput.files[0] ||
        !(coverInput.files[0].name.endsWith(".png") || coverInput.files[0].name.endsWith(".jpg"))
    ) {
        showError(coverInput, "La portada debe ser un archivo PNG o JPG.");
        isValid = false;
    }

    if (isValid) {
        const form = document.getElementById("upload-song");
        const formData = new FormData(form);

        uploadSong(formData);
        form.reset();
        $('#subirCancion').modal('hide');
    }
}

function showError(inputElement, message) {
    const errorElement = document.createElement("div");
    errorElement.className = "text-danger mt-1";
    errorElement.textContent = message;
    inputElement.parentElement.appendChild(errorElement);
}

function clearErrors() {
    const errorMessages = document.querySelectorAll(".text-danger");
    errorMessages.forEach((error) => error.remove());
}

// Función asíncrona para procesar la canción que se recibe por parte de submitSong y la envia a 
// la base de datos
async function uploadSong(formData) {
    try {
        const response = await fetch(apiUrl.concat('/upload'), {
            method: "POST",
            body: formData,
        });

        if (response.ok) {
            const data = await response.json();
            console.log("Subida exitosa:", data);
            fetchSongs();
        } else {
            throw new Error("Error en la subida");
        }
    } catch (error) {
        console.error("Error al subir la canción:", error);
    }
}

// Función asíncrona que obtiene las canciones de la base de datos mediante un fetch
async function fetchSongs() {
    try {
        const response = await fetch(apiUrl.concat('/songs'));

        if (!response.ok) {
            throw new Error('Error en la solicitud: ' + response.statusText);
        }

        music_list = await response.json();

        console.log("Se han recuperado:", music_list.length, "canciones");

        loadTrack(track_index);
        displayPlaylist();
    } catch (error) {
        console.error('Error al obtener las canciones:', error);
    }
}

// Función que se encarga de reproducir la canción seleccionada
function loadTrack(track_index) {
    clearInterval(updateTimer);
    reset();

    curr_track.src = music_list[track_index].filepath;
    curr_track.load();

    track_art.style.backgroundImage = "url(" + music_list[track_index].cover + ")";
    track_name.textContent = music_list[track_index].title;
    track_artist.textContent = music_list[track_index].artist;
    now_playing.textContent = "Sonando canción " + (track_index + 1) + " de " + music_list.length;

    updateTimer = setInterval(setUpdate, 1000);

    curr_track.addEventListener('ended', nextTrack);

    seek_slider.addEventListener('input', seekTo);

    volume_slider.addEventListener('input', setVolume);
}

// Función que se encarga de reiniciar el tiempo del reproductor al seleccionar una nueva canción
function reset() {
    curr_time.textContent = "00:00";
    total_duration.textContent = "00:00";
    seek_slider.value = 0;
}

// Función que controla el botón de canción aleatoria
function randomTrack() {
    isRandom = !isRandom;

    let randomIcon = document.querySelector('.random-track i');

    if (isRandom) {
        randomIcon.classList.add('active');
    } else {
        randomIcon.classList.remove('active');
    }
}

// Función que controla el botón de canción aleatoria
function repeatTrack() {
    isRepeat = !isRepeat;

    let repeatIcon = document.querySelector('.repeat-track i');

    if (isRepeat) {
        curr_track.loop = true;
        repeatIcon.classList.add('active');
    } else {
        curr_track.loop = false;
        repeatIcon.classList.remove('active');
    }
}

function playpauseTrack() {
    isPlaying ? pauseTrack() : playTrack();
}

// Función que reproduce la canción
function playTrack() {
    setVolume();
    curr_track.play();
    isPlaying = true;
    playpause_btn.innerHTML = '<i class="fa fa-pause-circle fa-5x"></i>';
}

// Función que pausa la canción
function pauseTrack() {
    curr_track.pause();
    isPlaying = false;
    playpause_btn.innerHTML = '<i class="fa fa-play-circle fa-5x"></i>';
}

// Función que avanza a la siguiente canción
function nextTrack() {
    if (track_index < music_list.length - 1 && isRandom === false) {
        track_index += 1;
    } else if (track_index < music_list.length - 1 && isRandom === true) {
        let random_index = Number.parseInt(Math.random() * music_list.length);
        track_index = random_index;
    } else {
        track_index = 0;
    }
    loadTrack(track_index);
    playTrack();
}

// Función que retrocede a la anterior canción
function prevTrack() {
    if (track_index > 0) {
        track_index -= 1;
    } else {
        track_index = music_list.length - 1;
    }
    loadTrack(track_index);
    playTrack();
}

// Función que controla el slider de tiempo de la canción
function seekTo() {
    let seekto = curr_track.duration * (seek_slider.value / 100);
    curr_track.currentTime = seekto;
}

// Función que controla el slider de volumen de la canción, que además dependiendo del volumen,
// muestra un icono de volumen diferente
function setVolume() {
    curr_track.volume = volume_slider.value / 100;

    if (curr_track.volume === 0) {
        volume_icon.innerHTML = '<i class="fa fa-volume-off"></i>';
    } else if (curr_track.volume > 0 && curr_track.volume <= 0.5) {
        volume_icon.innerHTML = '<i class="fa fa-volume-down"></i>';
    } else {
        volume_icon.innerHTML = '<i class="fa fa-volume-up"></i>';
    }
}

volume_icon.addEventListener('click', () => {
    if (curr_track.volume > 0) {
        curr_track.volume = 0;
        volume_slider.value = 0;
        volume_icon.innerHTML = '<i class="fa fa-volume-off"></i>';
    } else {
        curr_track.volume = 0.5;
        volume_slider.value = 50;
        volume_icon.innerHTML = '<i class="fa fa-volume-down"></i>';
    }
});

// Función que se encarga de actualizar constantemente el tiempo de la canción
function setUpdate() {
    let seekPosition = 0;
    if (!isNaN(curr_track.duration)) {
        seekPosition = curr_track.currentTime * (100 / curr_track.duration);
        seek_slider.value = seekPosition;

        let currentMinutes = Math.floor(curr_track.currentTime / 60);
        let currentSeconds = Math.floor(curr_track.currentTime - currentMinutes * 60);
        let durationMinutes = Math.floor(curr_track.duration / 60);
        let durationSeconds = Math.floor(curr_track.duration - durationMinutes * 60);

        if (currentSeconds < 10) {
            currentSeconds = "0" + currentSeconds;
        }
        if (durationSeconds < 10) {
            durationSeconds = "0" + durationSeconds;
        }
        if (currentMinutes < 10) {
            currentMinutes = "0" + currentMinutes;
        }
        if (durationMinutes < 10) {
            durationMinutes = "0" + durationMinutes;
        }

        curr_time.textContent = currentMinutes + ":" + currentSeconds;
        total_duration.textContent = durationMinutes + ":" + durationSeconds;
    }
}

// Función que se encarga de mostrar la lista de canciones en el HTML con toda su información,
// incluyendo también los corazones para marcar como favoritas las canciones
function displayPlaylist() {
    let favSongs = JSON.parse(localStorage.getItem('favSongs'));
    if (favSongs == null) {
        favSongs = [];
    }
    const playlistContainer = document.querySelector('.playlist');
    playlistContainer.innerHTML = '';
    music_list.forEach((music, index) => {
        const playlistItem = document.createElement('div');
        playlistItem.classList.add('playlist-item');

        const playlistItemImage = document.createElement('img');
        playlistItemImage.src = music.cover;
        const playlistItemDetails = document.createElement('div');
        playlistItemDetails.classList.add('playlist-item-details');
        playlistItemDetails.textContent = `${music.title} - ${music.artist}`;

        playlistItemDetails.onclick = () => {
            loadTrack(index);
            playTrack();
        };

        const favButton = document.createElement('i');
        favButton.classList.add('fa');
        favButton.classList.add('fa-heart');

        if (favSongs.includes(music.id)) {
            favButton.classList.add('active');
        }

        favButton.onclick = () => {
            if (favButton.classList.contains('active')) {
                favButton.classList.remove('active');
                favSongs = favSongs.filter(id => id !== music.id);
            } else {
                favButton.classList.add('active');
                favSongs.push(music.id);
            }
            localStorage.setItem('favSongs', JSON.stringify(favSongs));
        };


        playlistItem.appendChild(playlistItemImage);
        playlistItem.appendChild(playlistItemDetails);
        playlistItem.appendChild(favButton);

        playlistContainer.appendChild(playlistItem);
    });
}