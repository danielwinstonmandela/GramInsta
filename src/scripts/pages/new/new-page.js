import NewPresenter from './new-presenter';
import { convertBase64ToBlob } from '../../utils';
import * as GraminstaAPI from '../../data/api';
import { generateLoaderAbsoluteTemplate } from '../../templates';
import Camera from '../../utils/camera';
import Map from '../../utils/map';

export default class NewPage {
  #presenter;
  #form;
  #camera;
  #isCameraOpen = false;
  #takenDocumentations = [];
  #map = null;

  async render() {
    return `
      <section>
        <div class="new-report__header">
          <div class="container">
            <h1 class="new-report__header__title">Create New Story</h1>
            <p class="new-report__header__description">
              Fill out the form below to create a new story.<br>
              Please ensure all information is accurate.
            </p>
          </div>
        </div>
      </section>
  
      <section class="container">
        <div class="new-form__container">
          <form id="new-form" class="new-form">
            <div class="form-control">
              <label for="description-input" class="new-form__description__title">Description</label>
  
              <div class="new-form__description__container">
                <textarea
                  id="description-input"
                  name="description"
                  placeholder="Share your story... What happened? Where? When? Tell us all about it!"
                ></textarea>
              </div>
            </div>
            <div class="form-control">
              <label for="documentations-input" class="new-form__documentations__title">Photo</label>
              <div id="documentations-more-info">You can attach a photo as documentation.</div>
  
              <div class="new-form__documentations__container">
                <div class="new-form__documentations__buttons">
                  <button id="documentations-input-button" class="btn btn-outline" type="button">
                    Select Photo
                  </button>
                  <input
                    id="documentations-input"
                    name="documentations"
                    type="file"
                    accept="image/*"
                    multiple
                    hidden="hidden"
                    aria-multiline="true"
                    aria-describedby="documentations-more-info"
                  >
                  <button id="open-documentations-camera-button" class="btn btn-outline" type="button">
                    Open Camera
                  </button>
                </div>
                <div id="camera-container" class="new-form__camera__container">
                  <video id="camera-video" class="new-form__camera__video">
                    Video stream not available.
                  </video>
                  <canvas id="camera-canvas" class="new-form__camera__canvas"></canvas>
  
                  <div class="new-form__camera__tools">
                    <select id="camera-select"></select>
                    <div class="new-form__camera__tools_buttons">
                      <button id="camera-take-button" class="btn" type="button">
                        Take Photo
                      </button>
                    </div>
                  </div>
                </div>
                <ul id="documentations-taken-list" class="new-form__documentations__outputs"></ul>
              </div>
            </div>
            <div class="form-control">
              <div class="new-form__location__title">Location</div>
  
              <div class="new-form__location__container">
                <div class="new-form__location__map__container">
                  <div id="map" class="new-form__location__map"></div>
                  <div id="map-loading-container"></div>
                </div>
                <div class="new-form__location__lat-lng">
                  <input type="number" name="latitude" value="-6.175389" step="any" disabled>
                  <input type="number" name="longitude" value="106.827139" step="any" disabled>
                </div>
              </div>
            </div>
            <div class="form-buttons">
              <span id="submit-button-container">
                <button class="btn" type="submit">Create Story</button>
              </span>
              <a class="btn btn-outline" href="#/">Cancel</a>
            </div>
          </form>
        </div>
      </section>
    `;
  }

  async afterRender() {
    this.#presenter = new NewPresenter({
      view: this,
      model: GraminstaAPI,
    });
    this.#takenDocumentations = [];

    this.#presenter.showNewFormMap();
    this.#setupForm();
  }

  #setupForm() {
    this.#form = document.getElementById('new-form');
    this.#form.addEventListener('submit', async (event) => {
      event.preventDefault();

      // Validation for the form
      const description = this.#form.elements.namedItem('description').value.trim();
      
      if (!description) {
        this.#showError('Description is required. Please provide details about your story.');
        return;
      }
      
      if (description.length < 10) {
        this.#showError('Description must be at least 10 characters long.');
        return;
      }

      // Photo validation
      if (this.#takenDocumentations.length === 0) {
        this.#showError('Please add at least 1 photo to your story.');
        return;
      }

      if (this.#takenDocumentations.length > 1) {
        if (!confirm('Story API only accepts 1 photo. The first photo will be used. Continue?')) {
          return;
        }
      }

      const data = {
        description: description,
        photo: this.#takenDocumentations[0].blob, // yg pertama aja
        lat: parseFloat(this.#form.elements.namedItem('latitude').value),
        lon: parseFloat(this.#form.elements.namedItem('longitude').value),
      };
      
      await this.#presenter.postNewStory(data);
    });

    document.getElementById('documentations-input').addEventListener('change', async (event) => {
      const insertingPicturesPromises = Object.values(event.target.files).map(async (file) => {
        return await this.#addTakenPicture(file);
      });
      await Promise.all(insertingPicturesPromises);

      await this.#populateTakenPictures();
    });

    document.getElementById('documentations-input-button').addEventListener('click', () => {
      this.#form.elements.namedItem('documentations-input').click();
    });

    const cameraContainer = document.getElementById('camera-container');
    document
      .getElementById('open-documentations-camera-button')
      .addEventListener('click', async (event) => {
        cameraContainer.classList.toggle('open');
        this.#isCameraOpen = cameraContainer.classList.contains('open');

        if (this.#isCameraOpen) {
          event.currentTarget.textContent = 'Close Camera';
          this.#setupCamera();
          await this.#camera.launch();

          return;
        }

        event.currentTarget.textContent = 'Open Camera';
        this.#camera.stop();
      });
  }

  async initialMap() {
    this.#map = await Map.build('#map', {
      zoom: 15,
      locate: true,
    });
 
    document.querySelector('input[name="latitude"]').removeAttribute('disabled');
    document.querySelector('input[name="longitude"]').removeAttribute('disabled');

    const centerCoordinate = this.#map.getCenter();
    const draggableMarker = this.#map.addMarker(
      [centerCoordinate.latitude, centerCoordinate.longitude],
      { draggable: 'true' },
      {
        content: `<strong>Selected Location</strong><br>Lat: ${centerCoordinate.latitude.toFixed(8)}<br>
        Lon: ${centerCoordinate.longitude.toFixed(8)}<br>
        <em>Click map or drag marker to change</em>`
      }
    );

    this.#updateLatLngInput(centerCoordinate.latitude, centerCoordinate.longitude);

    draggableMarker.addEventListener('move', (event) => {
      const coordinate = event.target.getLatLng();
      this.#updateLatLngInput(coordinate.lat, coordinate.lng);
      
      draggableMarker.setPopupContent(
        `<strong>Selected Location</strong><br>Lat: ${coordinate.lat.toFixed(8)}<br>Lon: ${coordinate.lng.toFixed(8)}<br><em>Click map or drag marker to change</em>`
      );
    });

    this.#map.addMapEventListener('click', (event) => {
      const { lat, lng } = event.latlng;
      
      draggableMarker.setLatLng(event.latlng);
      
      draggableMarker.setPopupContent(
        `<strong>Selected Location</strong><br>Lat: ${lat.toFixed(8)}<br>Lon: ${lng.toFixed(8)}<br><em>Click map or drag marker to change</em>`
      );

      draggableMarker.openPopup();

      event.sourceTarget.flyTo(event.latlng);
    });
    

  }
  #updateLatLngInput(latitude, longitude) {
    this.#form.elements.namedItem('latitude').value = parseFloat(latitude.toFixed(8));
    this.#form.elements.namedItem('longitude').value = parseFloat(longitude.toFixed(8));
  }



  #setupCamera() {
    if (!this.#camera) {
      this.#camera = new Camera({
        video: document.getElementById('camera-video'),
        cameraSelect: document.getElementById('camera-select'),
        canvas: document.getElementById('camera-canvas'),
      });
    }

    this.#camera.addCheeseButtonListener('#camera-take-button', async () => {
      const image = await this.#camera.takePicture();
      await this.#addTakenPicture(image);
      await this.#populateTakenPictures();
    });
  }

  async #addTakenPicture(image) {
    let blob = image;

    if (image instanceof String) {
      blob = await convertBase64ToBlob(image, 'image/png');
    }

    const newDocumentation = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      blob: blob,
    };
    this.#takenDocumentations = [...this.#takenDocumentations, newDocumentation];
  }

  async #populateTakenPictures() {
    const html = this.#takenDocumentations.reduce((accumulator, picture, currentIndex) => {
      const imageUrl = URL.createObjectURL(picture.blob);
      return accumulator.concat(`
        <li class="new-form__documentations__outputs-item">
          <button type="button" data-deletepictureid="${picture.id}" class="new-form__documentations__outputs-item__delete-btn">
            <img src="${imageUrl}" alt="Photo ${currentIndex + 1}">
          </button>
        </li>
      `);
    }, '');

    document.getElementById('documentations-taken-list').innerHTML = html;

    document.querySelectorAll('button[data-deletepictureid]').forEach((button) =>
      button.addEventListener('click', (event) => {
        const pictureId = event.currentTarget.dataset.deletepictureid;

        const deleted = this.#removePicture(pictureId);
        if (!deleted) {
          console.log(`Picture with id ${pictureId} was not found`);
        }

        this.#populateTakenPictures();
      }),
    );
  }

  #removePicture(id) {
    const selectedPicture = this.#takenDocumentations.find((picture) => {
      return picture.id == id;
    });

    if (!selectedPicture) {
      return null;
    }

    this.#takenDocumentations = this.#takenDocumentations.filter((picture) => {
      return picture.id != selectedPicture.id;
    });

    return selectedPicture;
  }
  
  #showError(message) {
    // Remove any existing messages
    this.#clearMessages();
    
    // Create error message element
    const errorDiv = document.createElement('div');
    errorDiv.id = 'form-error-message';
    errorDiv.className = 'form-message form-error';
    errorDiv.style.cssText = 'color: #ff6b6b; padding: 12px 16px; margin: 0 0 20px 0; border: 1px solid #ff6b6b; border-radius: 8px; background: rgba(255, 107, 107, 0.1); font-size: 14px;';
    errorDiv.innerHTML = `<strong>⚠️ Error:</strong> ${message}`;
    
    this.#form.insertBefore(errorDiv, this.#form.firstChild);
    errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    setTimeout(() => errorDiv.remove(), 5000);
  }

  #showSuccess(message) {
    this.#clearMessages();
    
    const successDiv = document.createElement('div');
    successDiv.id = 'form-success-message';
    successDiv.className = 'form-message form-success';
    successDiv.style.cssText = 'color: #51cf66; padding: 12px 16px; margin: 0 0 20px 0; border: 1px solid #51cf66; border-radius: 8px; background: rgba(81, 207, 102, 0.1); font-size: 14px;';
    successDiv.innerHTML = `<strong>✓ Success:</strong> ${message}`;
    
    this.#form.insertBefore(successDiv, this.#form.firstChild);
    successDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  
  #clearMessages() {
    const existingError = document.getElementById('form-error-message');
    const existingSuccess = document.getElementById('form-success-message');
    if (existingError) existingError.remove();
    if (existingSuccess) existingSuccess.remove();
  }

  storeSuccessfully(message, isOffline = false) {
    this.#showSuccess(message || 'Story created successfully! Redirecting to home page...');
    this.clearForm();

    // If offline, don't redirect immediately
    if (isOffline) {
      setTimeout(() => {
        this.#clearMessages();
      }, 5000);
    } else {
      setTimeout(() => {
        location.hash = '/';
      }, 1500);
    }
  }

  storeFailed(message) {
    this.#showError(message || 'Failed to create story. Please check your connection and try again.');
  }

  clearForm() {
    this.#form.reset();
  }

  showMapLoading() {
    document.getElementById('map-loading-container').innerHTML = generateLoaderAbsoluteTemplate();
  }

  hideMapLoading() {
    document.getElementById('map-loading-container').innerHTML = '';
  }

  showSubmitLoadingButton() {
    document.getElementById('submit-button-container').innerHTML = `
      <button class="btn" type="submit" disabled>
        <i class="fas fa-spinner loader-button"></i> Creating Story...
      </button>
    `;
  }

  hideSubmitLoadingButton() {
    document.getElementById('submit-button-container').innerHTML = `
      <button class="btn" type="submit">Create Story</button>
    `;
  }
}
