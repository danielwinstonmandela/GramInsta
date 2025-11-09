import Database from '../../data/database';

export default class NewPresenter {
  #view;
  #model;

  constructor({ view, model }) {
    this.#view = view;
    this.#model = model;
  }

  async showNewFormMap() {
    this.#view.showMapLoading();
    try {
      await this.#view.initialMap();
    } catch (error) {
      console.error('showNewFormMap: error:', error);
    } finally {
      this.#view.hideMapLoading();
    }
  }

  async postNewStory({ description, photo, lat, lon }) {
    this.#view.showSubmitLoadingButton();

    // Check if online or offline
    const isOnline = navigator.onLine;

    try {
      if (isOnline) {
        // Normal online submission
        const data = {
          description: description,
          photo: photo,
          lat: lat,
          lon: lon,
        };
        const response = await this.#model.storeNewStory(data);

        if (!response.ok) {
          console.error('postNewStory: response:', response);
          this.#view.storeFailed(response.message);
          return;
        }

        this.#view.storeSuccessfully(response.message);
      } else {
        // Offline mode - save to IndexedDB queue
        await this.#saveStoryOffline({ description, photo, lat, lon });
      }
    } catch (error) {
      console.error('postNewStory: error:', error);

      // If online request failed, try saving offline
      if (isOnline && error.message.includes('fetch')) {
        console.log('Online request failed, saving offline...');
        await this.#saveStoryOffline({ description, photo, lat, lon });
      } else {
        this.#view.storeFailed(error.message);
      }
    } finally {
      this.#view.hideSubmitLoadingButton();
    }
  }

  async #saveStoryOffline({ description, photo, lat, lon }) {
    try {
      // Convert photo blob to base64 for storage
      const photoData = await this.#blobToBase64(photo);

      const offlineStory = {
        description,
        photoData, // Base64 string
        lat,
        lon,
      };

      const tempId = await Database.addPendingStory(offlineStory);
      console.log('Story saved offline with tempId:', tempId);

      // Register background sync
      if ('serviceWorker' in navigator && 'sync' in self.registration) {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('sync-stories');
        console.log('Background sync registered');
      }

      this.#view.storeSuccessfully(
        '📡 You are offline. Story saved and will be synced when you are back online!',
        true
      );
    } catch (error) {
      console.error('Error saving story offline:', error);
      this.#view.storeFailed('Failed to save story offline. Please try again.');
    }
  }

  async #blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
