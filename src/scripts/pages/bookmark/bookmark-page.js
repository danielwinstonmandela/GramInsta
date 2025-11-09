import {
  generateLoaderAbsoluteTemplate,
  generateStoryItemTemplate,
  generateStoriesListEmptyTemplate,
  generateStoriesListErrorTemplate,
} from '../../templates';
import Database from '../../data/database';
import Map from '../../utils/map';
import { storyMapper } from '../../data/api-mapper';

export default class BookmarkPage {
  #map = null;
  #allStories = [];

  async render() {
    return `
      <section>
        <div class="stories-list__map__container">
          <div id="map" class="stories-list__map"></div>
          <div id="map-loading-container"></div>
        </div>
      </section>

      <section class="container">
        <h1 class="section-title">Saved Stories</h1>
        
        <div class="stories-list__filter-container">
          <input 
            type="text" 
            id="search-input" 
            class="stories-list__search" 
            placeholder="Search saved stories..."
            aria-label="Search saved stories"
          />
          <select id="sort-select" class="stories-list__sort" aria-label="Sort stories">
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="title">By Title (A-Z)</option>
          </select>
        </div>

        <div class="stories-list__container">
          <div id="stories-list"></div>
          <div id="stories-list-loading-container"></div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    await this.#showStoriesListMap();
    await this.#initialGalleryAndMap();
    this.#setupFilters();
  }

  async #showStoriesListMap() {
    this.showMapLoading();
    try {
      await this.#initialMap();
    } catch (error) {
      console.error('showStoriesListMap: error:', error);
    } finally {
      this.hideMapLoading();
    }
  }

  async #initialGalleryAndMap() {
    this.showStoriesListLoading();

    try {
      const listOfStories = await Database.getAllStories();
      
      if (listOfStories.length === 0) {
        this.#allStories = [];
        this.#populateBookmarkedStoriesListEmpty();
        return;
      }

      // Map stories to proper format
      const stories = await Promise.all(listOfStories.map(storyMapper));
      this.#allStories = stories;

      const message = 'Successfully loaded saved stories.';
      this.#populateBookmarkedStories(message, stories);
    } catch (error) {
      console.error('initialGalleryAndMap: error:', error);
      this.#populateBookmarkedStoriesError(error.message);
    } finally {
      this.hideStoriesListLoading();
    }
  }

  #setupFilters() {
    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');

    if (searchInput) {
      searchInput.addEventListener('input', () => this.#applyFilters());
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', () => this.#applyFilters());
    }
  }

  #applyFilters() {
    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');

    if (!searchInput || !sortSelect) return;

    const searchTerm = searchInput.value.toLowerCase();
    const sortOrder = sortSelect.value;

    // Filter stories
    let filteredStories = this.#allStories.filter(story => {
      const titleMatch = story.title?.toLowerCase().includes(searchTerm);
      const descMatch = story.description?.toLowerCase().includes(searchTerm);
      const locationMatch = story.location?.placeName?.toLowerCase().includes(searchTerm);
      const authorMatch = story.reporter?.name?.toLowerCase().includes(searchTerm);
      
      return titleMatch || descMatch || locationMatch || authorMatch;
    });

    // Sort stories
    filteredStories.sort((a, b) => {
      switch (sortOrder) {
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        default:
          return 0;
      }
    });

    // Clear map markers
    if (this.#map) {
      this.#map.clearMarkers();
    }

    // Repopulate with filtered stories
    if (filteredStories.length === 0) {
      this.#populateBookmarkedStoriesListEmpty('No stories match your search.');
    } else {
      this.#populateBookmarkedStories('Filtered results', filteredStories);
    }
  }

  #populateBookmarkedStories(message, stories) {
    if (stories.length <= 0) {
      this.#populateBookmarkedStoriesListEmpty();
      return;
    }

    const html = stories.reduce((accumulator, story) => {
      if (this.#map && story.location) {
        const coordinate = [story.location.latitude, story.location.longitude];
        const markerOptions = { alt: story.title };
        const popupOptions = { content: story.title };

        this.#map.addMarker(coordinate, markerOptions, popupOptions);
      }

      return accumulator.concat(
        generateStoryItemTemplate({
          id: story.id,
          title: story.title,
          description: story.description,
          evidenceImages: story.evidenceImages || [story.photoUrl],
          location: story.location,
          reporterName: story.reporter.name,
          createdAt: story.createdAt,
        }),
      );
    }, '');

    document.getElementById('stories-list').innerHTML = `
      <div class="stories-list">${html}</div>
    `;
  }

  #populateBookmarkedStoriesListEmpty(customMessage = null) {
    const message = customMessage || 'No saved stories yet. Start saving your favorite stories!';
    document.getElementById('stories-list').innerHTML = `
      <div id="stories-list-empty" class="stories-list__empty">
        <h2>No Saved Stories</h2>
        <p>${message}</p>
      </div>
    `;
  }

  #populateBookmarkedStoriesError(message) {
    document.getElementById('stories-list').innerHTML = generateStoriesListErrorTemplate(message);
  }

  showStoriesListLoading() {
    document.getElementById('stories-list-loading-container').innerHTML =
      generateLoaderAbsoluteTemplate();
  }

  hideStoriesListLoading() {
    document.getElementById('stories-list-loading-container').innerHTML = '';
  }

  async #initialMap() {
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
}

