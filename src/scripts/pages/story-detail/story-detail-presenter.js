import { storyMapper } from '../../data/api-mapper';
import Database from '../../data/database';

export default class StoryDetailPresenter {
  #storyId;
  #view;
  #apiModel;
  #currentStory = null;

  constructor(storyId, { view, apiModel }) {
    this.#storyId = storyId;
    this.#view = view;
    this.#apiModel = apiModel;
  }

  async showStoryDetailMap() {
    this.#view.showMapLoading();
    try {
      await this.#view.initialMap();
    } catch (error) {
      console.error('showStoryDetailMap: error:', error);
    } finally {
      this.#view.hideMapLoading();
    }
  }

  async showStoryDetail() {
    this.#view.showStoryDetailLoading();
    try {
      const response = await this.#apiModel.getStoryById(this.#storyId);

      if (!response.ok) {
        console.error('showStoryDetail: response:', response);
        this.#view.populateStoryDetailError(response.message);
        return;
      }

      const story = await storyMapper(response.story);
      this.#currentStory = story;
      console.log(story); // for debugging purpose
      this.#view.populateStoryDetailAndInitialMap(response.message, story);

    } catch (error) {
      console.error('showStoryDetail: error:', error);
      this.#view.populateStoryDetailError(error.message);
    } finally {
      this.#view.hideStoryDetailLoading();
    }
  }

  async showSaveButton() {
    const isSaved = await this.#isStorySaved();
    
    if (isSaved) {
      this.#view.renderRemoveButton(async () => {
        await this.#removeStory();
      });
      return;
    }

    this.#view.renderSaveButton(async () => {
      await this.#saveStory();
    });
  }

  async #isStorySaved() {
    try {
      const story = await Database.getStoryById(this.#storyId);
      return !!story;
    } catch (error) {
      return false;
    }
  }

  async #saveStory() {
    try {
      if (!this.#currentStory) {
        alert('Story data not available');
        return;
      }

      await Database.putStory(this.#currentStory);
      alert('Story saved successfully!');
      await this.showSaveButton(); // Refresh button
    } catch (error) {
      console.error('Error saving story:', error);
      
      if (error.message.includes('already exists') || error.name === 'ConstraintError') {
        alert('This story is already saved!');
      } else {
        alert('Failed to save story. Please try again.');
      }
    }
  }

  async #removeStory() {
    try {
      await Database.removeStory(this.#storyId);
      alert('Story removed successfully!');
      await this.showSaveButton(); // Refresh button
    } catch (error) {
      console.error('Error removing story:', error);
      alert('Failed to remove story. Please try again.');
    }
  }

  async sendNotificationAboutStory() {
    try {
      if (!this.#currentStory) {
        alert('Story data not available');
        return;
      }

      // Check if service worker is ready
      if (!('serviceWorker' in navigator)) {
        alert('Service Worker not supported in this browser');
        return;
      }

      // Check notification permission
      if (Notification.permission === 'denied') {
        alert('Notifications are blocked. Please enable them in browser settings.');
        return;
      }

      // Request permission if needed
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          alert('Notification permission was denied.');
          return;
        }
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Create notification about this specific story
      const story = this.#currentStory;
      const notificationTitle = `📱 ${story.title || 'New Story'}`;
      const notificationOptions = {
        body: story.description || 'Check out this story!',
        icon: story.photoUrl || '/images/logo.png',
        badge: '/favicon.png',
        tag: `story-${this.#storyId}`,
        requireInteraction: false,
        data: {
          url: `/#/stories/${this.#storyId}`,
          storyId: this.#storyId,
        },
        actions: [
          {
            action: 'view',
            title: '👁️ View Story',
          },
          {
            action: 'close',
            title: '❌ Close',
          },
        ],
      };

      // Show the notification
      await registration.showNotification(notificationTitle, notificationOptions);

      alert('✅ Notification sent! Check your notification center.');
      console.log('Notification sent for story:', this.#storyId);
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Failed to send notification. Please try again.');
    }
  }
}
