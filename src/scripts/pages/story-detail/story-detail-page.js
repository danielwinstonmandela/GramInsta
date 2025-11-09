import {
  generateCommentsListEmptyTemplate,
  generateCommentsListErrorTemplate,
  generateLoaderAbsoluteTemplate,
  generateRemoveStoryButtonTemplate,
  generateStoryCommentItemTemplate,
  generateStoryDetailErrorTemplate,
  generateStoryDetailTemplate,
  generateSaveStoryButtonTemplate,
} from '../../templates';
import { createCarousel } from '../../utils';
import StoryDetailPresenter from './story-detail-presenter';
import { parseActivePathname } from '../../routes/url-parser';
import Map from '../../utils/map';
import * as GraminstaAPI from '../../data/api';

export default class StoryDetailPage {
  #presenter = null;
  #form = null;
  #map = null;

  async render() {
    return `
      <section>
        <div class="story-detail__container">
          <div id="story-detail" class="story-detail"></div>
          <div id="story-detail-loading-container"></div>
        </div>
      </section>
      
      <section class="container">
        <hr>
        <div class="story-detail__comments__container">
          <div class="story-detail__comments-form__container">
            <h2 class="story-detail__comments-form__title">Add Comment</h2>
            <form id="comments-list-form" class="story-detail__comments-form__form">
              <textarea name="body" placeholder="Share your thoughts about this story..."></textarea>
              <div id="submit-button-container">
                <button class="btn" type="submit">Submit</button>
              </div>
            </form>
          </div>
          <hr>
          <div class="story-detail__comments-list__container">
            <div id="story-detail-comments-list"></div>
            <div id="comments-list-loading-container"></div>
          </div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    const url = parseActivePathname();
    this.#presenter = new StoryDetailPresenter(url.id, {
      view: this,
      apiModel: GraminstaAPI,
    });

    await this.#presenter.showStoryDetail();
  }

  async populateStoryDetailAndInitialMap(message, story) {
    // Story API has single photoUrl, not evidenceImages array
    const evidenceImages = story.photoUrl ? [{ imageUrl: story.photoUrl }] : [];
    
    document.getElementById('story-detail').innerHTML = generateStoryDetailTemplate({
      title: story.title,
      description: story.description,
      evidenceImages: evidenceImages,
      location: story.location,
      reporterName: story.reporter.name,
      createdAt: story.createdAt,
    });

    createCarousel(document.getElementById('images'));

    if (story.location) {
      await this.#presenter.showStoryDetailMap();
      if (this.#map) {
        const storyCoordinate = [story.location.latitude, story.location.longitude];
        const markerOptions = { alt: story.title };
        const popupOptions = { content: story.title };
        this.#map.changeCamera(storyCoordinate);
        this.#map.addMarker(storyCoordinate, markerOptions, popupOptions);
      }
    }

    await this.#presenter.showSaveButton();
    this.addNotifyMeEventListener();
  }

  populateStoryDetailError(message) {
    document.getElementById('story-detail').innerHTML = generateStoryDetailErrorTemplate(message);
  }

  populateStoryDetailComments(message, comments) {
    if (comments.length <= 0) {
      this.populateCommentsListEmpty();
      return;
    }

    const html = comments.reduce(
      (accumulator, comment) =>
        accumulator.concat(
          generateStoryCommentItemTemplate({
            photoUrlCommenter: comment.commenter.photoUrl,
            nameCommenter: comment.commenter.name,
            body: comment.body,
          }),
        ),
      '',
    );

    document.getElementById('story-detail-comments-list').innerHTML = `
      <div class="story-detail__comments-list">${html}</div>
    `;
  }

  populateCommentsListEmpty() {
    document.getElementById('story-detail-comments-list').innerHTML =
      generateCommentsListEmptyTemplate();
  }

  populateCommentsListError(message) {
    document.getElementById('story-detail-comments-list').innerHTML =
      generateCommentsListErrorTemplate(message);
  }

  async initialMap() {
    this.#map = await Map.build('#map', {
      zoom: 15,
    });
  }

  #setupForm() {
    this.#form = document.getElementById('comments-list-form');
    this.#form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const data = {
        body: this.#form.elements.namedItem('body').value,
      };
      await this.#presenter.postNewComment(data);
    });
  }

  postNewCommentSuccessfully(message) {
    console.log(message);

    this.#presenter.getCommentsList();
    this.clearForm();
  }

  postNewCommentFailed(message) {
    alert(message);
  }

  clearForm() {
    this.#form.reset();
  }

  renderSaveButton(onSaveCallback) {
    document.getElementById('save-actions-container').innerHTML =
      generateSaveStoryButtonTemplate();

    document.getElementById('story-detail-save').addEventListener('click', async () => {
      if (onSaveCallback) {
        await onSaveCallback();
      }
    });
  }

  renderRemoveButton(onRemoveCallback) {
    document.getElementById('save-actions-container').innerHTML =
      generateRemoveStoryButtonTemplate();

    document.getElementById('story-detail-remove').addEventListener('click', async () => {
      if (onRemoveCallback) {
        await onRemoveCallback();
      }
    });
  }

  addNotifyMeEventListener() {
    const notifyButton = document.getElementById('story-detail-notify-me');
    if (notifyButton) {
      notifyButton.addEventListener('click', async () => {
        await this.#presenter.sendNotificationAboutStory();
      });
    }
  }

  showStoryDetailLoading() {
    document.getElementById('story-detail-loading-container').innerHTML =
      generateLoaderAbsoluteTemplate();
  }

  hideStoryDetailLoading() {
    document.getElementById('story-detail-loading-container').innerHTML = '';
  }

  showMapLoading() {
    document.getElementById('map-loading-container').innerHTML = generateLoaderAbsoluteTemplate();
  }

  hideMapLoading() {
    document.getElementById('map-loading-container').innerHTML = '';
  }

  showCommentsLoading() {
    document.getElementById('comments-list-loading-container').innerHTML =
      generateLoaderAbsoluteTemplate();
  }

  hideCommentsLoading() {
    document.getElementById('comments-list-loading-container').innerHTML = '';
  }

  showSubmitLoadingButton() {
    document.getElementById('submit-button-container').innerHTML = `
      <button class="btn" type="submit" disabled>
        <i class="fas fa-spinner loader-button"></i> Submitting...
      </button>
    `;
  }

  hideSubmitLoadingButton() {
    document.getElementById('submit-button-container').innerHTML = `
      <button class="btn" type="submit">Submit</button>
    `;
  }
}
