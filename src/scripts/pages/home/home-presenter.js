import { storyMapper } from '../../data/api-mapper';

export default class HomePresenter {
  #view;
  #model;

  constructor({ view, model }) {
    this.#view = view;
    this.#model = model;
  }

  async showStoriesListMap() {
    this.#view.showMapLoading();
    try {
      await this.#view.initialMap();
    } catch (error) {
      console.error('showStoriesListMap: error:', error);
    } finally {
      this.#view.hideMapLoading();
    }
  }

  async initialGalleryAndMap() {
    this.#view.showLoading();
    try {
      await this.showStoriesListMap();

      const response = await this.#model.getAllStories();

      console.log('API Response:', response); // Debug log

      if (!response.ok) {
        console.error('initialGalleryAndMap: response:', response);
        this.#view.populateStoriesListError(response.message || 'Gagal mengambil data stories');
        return;
      }

      if (!response.listStory || !Array.isArray(response.listStory)) {
        console.error('listStory is not an array:', response);
        this.#view.populateStoriesListError('Format data tidak valid');
        return;
      }

      const mappedStories = await Promise.all(
        response.listStory.map(async (story) => await storyMapper(story))
      );

      this.#view.populateStoriesList(response.message, mappedStories);
    } catch (error) {
      console.error('initialGalleryAndMap: error:', error);
      this.#view.populateStoriesListError(error.message || 'Terjadi kesalahan');
    } finally {
      this.#view.hideLoading();
    }
  }
}
