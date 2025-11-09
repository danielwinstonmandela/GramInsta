import {
  generateLoaderAbsoluteTemplate,
  generateStoryItemTemplate,
  generateStoriesListEmptyTemplate,
  generateStoriesListErrorTemplate,
} from '../../templates';
import HomePresenter from './home-presenter';
import Map from '../../utils/map';
import * as GraminstaAPI from '../../data/api';

export default class HomePage {
  #presenter = null;
  #map = null;
  #markers = [];

  async render() {
    return `
      <section>
        <div class="stories-list__map__container">
          <div id="map" class="stories-list__map"></div>
          <div id="map-loading-container"></div>
        </div>
      </section>

      <section class="container">
        <h1 class="section-title">Stories Feed</h1>

        <div class="stories-list__container">
          <div id="stories-list"></div>
          <div id="stories-list-loading-container"></div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    this.#presenter = new HomePresenter({
      view: this,
      model: GraminstaAPI,
    });

    await this.#presenter.initialGalleryAndMap();
  }

  populateStoriesList(message, stories) {
    if (stories.length <= 0) {
      this.populateStoriesListEmpty();
      return;
    }

    this.#markers = [];

    const html = stories.reduce((accumulator, story) => {
      if (this.#map && story.location) {
        const coordinate = [story.location.latitude, story.location.longitude];
        const markerOptions = { alt: story.title };
        const popupOptions = { 
          content: `<strong>${story.reporter.name}</strong><br>${story.description.substring(0, 100)}...` 
        };
        const marker = this.#map.addMarker(coordinate, markerOptions, popupOptions);
        
        this.#markers.push({
          storyId: story.id,
          marker: marker,
          coordinate: coordinate,
        });
      }
 
      return accumulator.concat(
        generateStoryItemTemplate({
          ...story,
          reporterName: story.reporter.name,
        }),
      );
    }, '');

    document.getElementById('stories-list').innerHTML = `
      <div class="stories-list">${html}</div>
    `;
    
    this.#addStoryClickListeners(stories);
  }
  
  #addStoryClickListeners(stories) {
    stories.forEach((story) => {
      if (!story.location) return; // dUHH PUSUINGGGG
      
      const storyElement = document.querySelector(`[data-storyid="${story.id}"]`);
      if (storyElement) {
        storyElement.style.cursor = 'pointer';
        storyElement.addEventListener('click', (e) => {
          if (!e.target.closest('.story-item__read-more')) {
            this.#flyToStoryLocation(story);
          }
        });
      }
    });
  }
  
  #flyToStoryLocation(story) {
    if (!this.#map || !story.location) return;
    
    const coordinate = [story.location.latitude, story.location.longitude];
    
    this.#map.changeCamera(coordinate, 16);
    
    const markerData = this.#markers.find(m => m.storyId === story.id);
    if (markerData && markerData.marker) {
      markerData.marker.openPopup();
    }
  }

  populateStoriesListEmpty() {
    document.getElementById('stories-list').innerHTML = generateStoriesListEmptyTemplate();
  }

  populateStoriesListError(message) {
    document.getElementById('stories-list').innerHTML = generateStoriesListErrorTemplate(message);
  }

   async initialMap() {
    this.#map = await Map.build('#map', {
      zoom: 10,
      locate: true,
    });
  }

  showMapLoading() {
    document.getElementById('map-loading-container').innerHTML = generateLoaderAbsoluteTemplate();
  }

  hideMapLoading() {
    document.getElementById('map-loading-container').innerHTML = '';
  }

  showLoading() {
    document.getElementById('stories-list-loading-container').innerHTML =
      generateLoaderAbsoluteTemplate();
  }

  hideLoading() {
    document.getElementById('stories-list-loading-container').innerHTML = '';
  }
}
