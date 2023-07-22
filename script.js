'use strict';

class WorkoutCl {
  // create a new date in popup window
  date = new Date();
  // it better to use libraries to create id
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in miles
    this.duration = duration; // in minutes
  }

  // Create a method for date. you can use the comment pretty to ignore so months are arrange horizontally vs vertically
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()] // get month get current month
    } ${this.date.getDate()}`;
  }
  // add a click count when click on workout list
  click() {
    this.clicks++;
  }
}

class RunningCl extends WorkoutCl {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    // it fine to call any code in constructor
    this.calcPace();
    this._setDescription(); // need to add to child since we need type
  }

  calcPace() {
    // min/mile
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class CyclingCl extends WorkoutCl {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription(); // need to add to child since we need type
  }
  // speed formula is opposite of pace
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}
// creating a run activity an inputing data based off parameters. Experient testing
// const run1 = new RunningCl([39, -12], 5.2, 24, 178);
// const cycl1 = new CyclingCl([39, -12], 27, 95, 523);
// console.log(run1, cycl1);
/////////////////////////////////////
// Application Architecture
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  // private instance properties
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  // create an empty array to push each workout
  #workouts = [];
  // Load Page. You can add event listener here if element doesn't exist yet
  constructor() {
    // Get users position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();
    // Attach event handlers
    // we need to point to form so we add a bind to this without it would point to app
    form.addEventListener('submit', this._newWorkout.bind(this));
    // you don't to bind it since there is no this method inside the toggleElevationField function
    inputType.addEventListener('change', this._toggleElevationField);
    // place in constructor because element not exist yet
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      // this is undefined so you need to bind it to this
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
  }

  // Received position
  _loadMap(position) {
    // deconstructure
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    console.log(`https://www.google.pt/maps/@${latitude},${longitude}`);
    // we store latitude and longitude in a variable called coords
    const coords = [latitude, longitude];

    // use the coords variable to show our location
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    // console.log(map);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    // on is inherited method inside of leaflet. we want to use it as an event listener
    // handling clicks on map
    // error fix cannot write private member #mapEvent to an object whose class did not declare it
    this.#map.on('click', this._showForm.bind(this)); //.bind(this) fix error

    // load markers saved on local storage
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  // // Click on map
  _showForm(mapE) {
    this.#mapEvent = mapE;
    // remove hidden class
    form.classList.remove('hidden');
    // when click it will go to the input distance
    inputDistance.focus();
  }
  // hide form after submit form
  _hideForm() {
    // Empty inputs
    // prettier-ignore
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  // // Change input running to cycling and swapping elevation gain to cadence
  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  // Submit form
  _newWorkout(e) {
    // when we use ... rest parameters we get an array
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp)); // will loop over inputs array and check every if number is finite
    // check if inputs are positive
    const allPositive = (...inputs) => inputs.every(inp => inp > 0); // checking every inputs which are distance, duration, cadence is greater than zero

    e.preventDefault();

    // Get data from form
    // you can still grab the value even if a select option
    const type = inputType.value;
    // need to convert to a number
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    //deconstructor mapEvent.latlng object to store them in lat lng variable we are able to reuse it
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // if workout is running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be postive numbers!');
      // create a new workout
      workout = new RunningCl([lat, lng], distance, duration, cadence);
      // push workout to workouts array
    }
    // if workout is cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration, elevation)
      )
        return alert('Inputs have to be postive numbers!');
      // we use let workout so we can use workout in running and cycling
      workout = new CyclingCl([lat, lng], distance, duration, elevation);
    }
    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // console.log(this.#mapEvent);

    // add markers when click on map

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form + Clear input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStoarage();
  }
  _renderWorkoutMarker(workout) {
    // communicate with leaflet to display this marker
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          // read leaflet docs in order to change default settings
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      ) // edit content in popup
      .openPopup(); // open popup
  }

  _renderWorkout(workout) {
    // use let to be able to use html again in if statement. We will insert this as a sibling element under form
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">m</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;

    if (workout.type === 'running')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/m</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
    `;
    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">ft</span>
        </div>
      </li>
    `;
    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    // read documents leaflet for setView method. after mapZoomLevel you can add a parameter options these options are from leaflet
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // using the public interface
    // workout.click();
  }
  // do not use local storage to store large amount of data
  _setLocalStoarage() {
    // browser provide an api we can use. workouts is key and #workouts is value
    localStorage.setItem('workouts', JSON.stringify(this.#workouts)); // convert any object in js to string
  }
  // get item from local storage
  _getLocalStorage() {
    //when you convert object to string and string back to object you lose all the inheritance from the parent class
    const data = JSON.parse(localStorage.getItem('workouts')); // convert string to object

    // if there is no data in local storage
    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem('workouts'); // remove the workouts from localStorage
    location.reload(); // location is a method in browser that you can use like this to reload page
  }
}
// new app is created out of the class and stored in variable called app
const app = new App();

// Ability to edit a workout;
// Ability to delete a workout;
// Ability to delete all workouts;
// Ability to sort workouts by a certain field (e.g. distance);
// Re-build Running and Cycling objects coming from local storage;
// More realistic error and confirmation messages;
/// Very hard
// Ability to position the map to show all workouts. deep dive leaflet library
// Ability to draw lines and shapes instead of just points
//////////////// Advance
// use 3rd party api to plug in coordinates. description of location.
// Geocode location from coordinates (" Run in Faro, Portugal") [only after asynchronous JavaScript section]
// Display weather or workout time or place.
