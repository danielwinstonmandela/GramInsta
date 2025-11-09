import { showFormattedDate } from './utils';

export function generateLoaderTemplate() {
  return `
    <div class="loader"></div>
  `;
}

export function generateLoaderAbsoluteTemplate() {
  return `
    <div class="loader loader-absolute"></div>
  `;
}

export function generateMainNavigationListTemplate() {
  return `
    <li><a id="story-list-button" class="story-list-button" href="#/">Stories Feed</a></li>
    <li><a id="bookmark-button" class="bookmark-button" href="#/bookmark">Saved Stories</a></li>
  `;
}

export function generateUnauthenticatedNavigationListTemplate() {
  return `
    <li id="push-notification-tools" class="push-notification-tools"></li>
    <li><a id="login-button" href="#/login">Login</a></li>
    <li><a id="register-button" href="#/register">Register</a></li>
  `;
}

export function generateAuthenticatedNavigationListTemplate() {
  return `
    <li id="push-notification-tools" class="push-notification-tools"></li>
    <li><a id="new-story-button" class="btn new-story-button" href="#/new">Create Story <i class="fas fa-plus"></i></a></li>
    <li><a id="logout-button" class="logout-button" href="#/logout"><i class="fas fa-sign-out-alt"></i> Logout</a></li>
  `;
}

export function generateStoriesListEmptyTemplate() {
  return `
    <div id="stories-list-empty" class="stories-list__empty">
      <h2>No stories available</h2>
      <p>There are currently no stories to display.</p>
    </div>
  `;
}

export function generateStoriesListErrorTemplate(message) {
  return `
    <div id="stories-list-error" class="stories-list__error">
      <h2>Error loading stories</h2>
      <p>${message ? message : 'Please try a different network or report this error.'}</p>
    </div>
  `;
}

export function generateStoryDetailErrorTemplate(message) {
  return `
    <div id="story-detail-error" class="story-detail__error">
      <h2>Error loading story details</h2>
      <p>${message ? message : 'Please try a different network or report this error.'}</p>
    </div>
  `;
}

export function generateCommentsListEmptyTemplate() {
  return `
    <div id="story-detail-comments-list-empty" class="story-detail__comments-list__empty">
      <h2>No comments available</h2>
      <p>There are currently no comments to display.</p>
    </div>
  `;
}

export function generateCommentsListErrorTemplate(message) {
  return `
    <div id="story-detail-comments-list-error" class="story-detail__comments-list__error">
      <h2>Error loading comments</h2>
      <p>${message ? message : 'Please try a different network or report this error.'}</p>
    </div>
  `;
}

export function generateStoryItemTemplate({
  id,
  title,
  description,
  evidenceImages,
  location,
  reporterName,
  createdAt,
}) {
  // Handle image URL - evidenceImages can be array of URLs or objects with imageUrl
  const imageUrl = evidenceImages && evidenceImages.length > 0 
    ? (typeof evidenceImages[0] === 'string' ? evidenceImages[0] : evidenceImages[0].imageUrl)
    : 'images/placeholder-image.jpg';
  
  // Handle location - can be null for stories without location
  const locationText = location && location.placeName 
    ? location.placeName 
    : (location ? `${location.latitude}, ${location.longitude}` : 'Location not available');

  return `
    <div tabindex="0" class="story-item" data-storyid="${id}">
      <img class="story-item__image" src="${imageUrl}" alt="${title}">
      <div class="story-item__body">
        <div class="story-item__main">
          <h2 id="story-title" class="story-item__title">${title}</h2>
          <div class="story-item__more-info">
            <div class="story-item__createdat">
              <i class="fas fa-calendar-alt"></i> ${showFormattedDate(createdAt, 'id-ID')}
            </div>
            <div class="story-item__location">
              <i class="fas fa-map"></i> ${locationText}
            </div>
          </div>
        </div>
        <div id="story-description" class="story-item__description">
          ${description}
        </div>
        <div class="story-item__more-info">
          <div class="story-item__author">
            Posted by: ${reporterName}
          </div>
        </div>
        <a class="btn story-item__read-more" href="#/stories/${id}">
          Read More <i class="fas fa-arrow-right"></i>
        </a>
      </div>
    </div>
  `;
}

export function generateDamageLevelMinorTemplate() {
  return `
    <span class="story-detail__damage-level__minor" data-damage-level="minor">Low Priority</span>
  `;
}

export function generateDamageLevelModerateTemplate() {
  return `
    <span class="story-detail__damage-level__moderate" data-damage-level="moderate">Medium Priority</span>
  `;
}

export function generateDamageLevelSevereTemplate() {
  return `
    <span class="story-detail__damage-level__severe" data-damage-level="severe">High Priority</span>
  `;
}

export function generateDamageLevelBadge(damageLevel) {
  if (damageLevel === 'minor') {
    return generateDamageLevelMinorTemplate();
  }

  if (damageLevel === 'moderate') {
    return generateDamageLevelModerateTemplate();
  }

  if (damageLevel === 'severe') {
    return generateDamageLevelSevereTemplate();
  }

  return '';
}

export function generateStoryDetailImageTemplate(imageUrl = null, alt = '') {
  // Handle both string URLs and objects with imageUrl property
  const url = typeof imageUrl === 'string' ? imageUrl : imageUrl?.imageUrl;
  
  if (!url) {
    return `
      <img class="story-detail__image" src="images/placeholder-image.jpg" alt="Placeholder Image">
    `;
  }

  return `
    <img class="story-detail__image" src="${url}" alt="${alt}">
  `;
}

export function generateStoryCommentItemTemplate({ photoUrlCommenter, nameCommenter, body }) {
  return `
    <article tabindex="0" class="story-detail__comment-item">
      <img
        class="story-detail__comment-item__photo"
        src="${photoUrlCommenter}"
        alt="Commenter name: ${nameCommenter}"
      >
      <div class="story-detail__comment-item__body">
        <div class="story-detail__comment-item__body__more-info">
          <div class="story-detail__comment-item__body__author">${nameCommenter}</div>
        </div>
        <div class="story-detail__comment-item__body__text">${body}</div>
      </div>
    </article>
  `;
}

export function generateStoryDetailTemplate({
  title,
  description,
  damageLevel,
  evidenceImages,
  location,
  reporterName,
  createdAt,
}) {
  const createdAtFormatted = showFormattedDate(createdAt, 'id-ID');
  const damageLevelBadge = generateDamageLevelBadge(damageLevel);
  const imagesHtml = evidenceImages.reduce(
    (accumulator, evidenceImage) =>
      accumulator.concat(generateStoryDetailImageTemplate(evidenceImage, title)),
    '',
  );

  return `
    <div class="story-detail__header">
      <h1 id="title" class="story-detail__title">${title}</h1>

      <div class="story-detail__more-info">
        <div class="story-detail__more-info__inline">
          <div id="createdat" class="story-detail__createdat" data-value="${createdAtFormatted}"><i class="fas fa-calendar-alt"></i></div>
          <div id="location-place-name" class="story-detail__location__place-name" data-value="${location.placeName}"><i class="fas fa-map"></i></div>
        </div>
        <div class="story-detail__more-info__inline">
          <div id="location-latitude" class="story-detail__location__latitude" data-value="${location.latitude}">Latitude:</div>
          <div id="location-longitude" class="story-detail__location__longitude" data-value="${location.longitude}">Longitude:</div>
        </div>
        <div id="author" class="story-detail__author" data-value="${reporterName}">Posted by:</div>
      </div>

      <div id="damage-level" class="story-detail__damage-level">
        ${damageLevelBadge}
      </div>
    </div>

    <div class="container">
      <div class="story-detail__images__container">
        <div id="images" class="story-detail__images">${imagesHtml}</div>
      </div>
    </div>

    <div class="container">
      <div class="story-detail__body">
        <div class="story-detail__body__description__container">
          <h2 class="story-detail__description__title">Full Details</h2>
          <div id="description" class="story-detail__description__body">
            ${description}
          </div>
        </div>
        <div class="story-detail__body__map__container">
          <h2 class="story-detail__map__title">Location Map</h2>
          <div class="story-detail__map__container">
            <div id="map" class="story-detail__map"></div>
            <div id="map-loading-container"></div>
          </div>
        </div>
  
        <hr>
  
        <div class="story-detail__body__actions__container">
          <h2>Actions</h2>
          <div class="story-detail__actions__buttons">
            <div id="save-actions-container"></div>
            <div id="notify-me-actions-container">
              <button id="story-detail-notify-me" class="btn btn-transparent">
                Try Notify Me <i class="far fa-bell"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function generateSubscribeButtonTemplate() {
  return `
    <button id="subscribe-button" class="btn subscribe-button">
      Subscribe <i class="fas fa-bell"></i>
    </button>
  `;
}

export function generateUnsubscribeButtonTemplate() {
  return `
    <button id="unsubscribe-button" class="btn unsubscribe-button">
      Unsubscribe <i class="fas fa-bell-slash"></i>
    </button>
  `;
}

export function generateSaveStoryButtonTemplate() {
  return `
    <button id="story-detail-save" class="btn btn-transparent">
      Save story <i class="far fa-bookmark"></i>
    </button>
  `;
}

export function generateRemoveStoryButtonTemplate() {
  return `
    <button id="story-detail-remove" class="btn btn-transparent">
      Remove story <i class="fas fa-bookmark"></i>
    </button>
  `;
}
