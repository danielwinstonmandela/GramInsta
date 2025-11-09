import { getActiveRoute } from '../routes/url-parser';
import {
  generateAuthenticatedNavigationListTemplate,
  generateMainNavigationListTemplate,
  generateUnauthenticatedNavigationListTemplate,
  generateSubscribeButtonTemplate,
  generateUnsubscribeButtonTemplate,
} from '../templates';
import { setupSkipToContent, transitionHelper } from '../utils';
import { getAccessToken, getLogout } from '../utils/auth';
import { routes } from '../routes/routes';
import {
  subscribe,
  unsubscribe,
  isCurrentPushSubscriptionAvailable,
  isNotificationAvailable,
} from '../utils/notification-helper';

export default class App {
  #content;
  #drawerButton;
  #drawerNavigation;
  #skipLinkButton;

  constructor({ content, drawerNavigation, drawerButton, skipLinkButton }) {
    this.#content = content;
    this.#drawerButton = drawerButton;
    this.#drawerNavigation = drawerNavigation;
    this.#skipLinkButton = skipLinkButton;

    this.#init();
  }

  #init() {
    setupSkipToContent(this.#skipLinkButton, this.#content);
    this.#setupDrawer();
  }

  #setupDrawer() {
    this.#drawerButton.addEventListener('click', () => {
      this.#drawerNavigation.classList.toggle('open');
    });

    document.body.addEventListener('click', (event) => {
      const isTargetInsideDrawer = this.#drawerNavigation.contains(event.target);
      const isTargetInsideButton = this.#drawerButton.contains(event.target);

      if (!(isTargetInsideDrawer || isTargetInsideButton)) {
        this.#drawerNavigation.classList.remove('open');
      }

      this.#drawerNavigation.querySelectorAll('a').forEach((link) => {
        if (link.contains(event.target)) {
          this.#drawerNavigation.classList.remove('open');
        }
      });
    });
  }

  async #setupNavigationList() {
    const isLogin = !!getAccessToken();
    const navListMain = this.#drawerNavigation.children.namedItem('navlist-main');
    const navList = this.#drawerNavigation.children.namedItem('navlist');

    // User not log in
    if (!isLogin) {
      navListMain.innerHTML = '';
      navList.innerHTML = generateUnauthenticatedNavigationListTemplate();
      await this.#setupPushNotificationTools();
      return;
    }

    navListMain.innerHTML = generateMainNavigationListTemplate();
    navList.innerHTML = generateAuthenticatedNavigationListTemplate();

    await this.#setupPushNotificationTools();

    const logoutButton = document.getElementById('logout-button');
    logoutButton.addEventListener('click', (event) => {
      event.preventDefault();

      if (confirm('Are you sure that you want to log out?')) {
        getLogout();

        location.hash = '/login';
      }
    });
  }

  async #setupPushNotificationTools() {
    const pushNotificationTools = document.getElementById('push-notification-tools');
    
    if (!pushNotificationTools) {
      return;
    }

    // Check if notification API is available
    if (!isNotificationAvailable()) {
      pushNotificationTools.innerHTML = '';
      return;
    }

    // Check if user is already subscribed
    const isSubscribed = await isCurrentPushSubscriptionAvailable();

    if (isSubscribed) {
      pushNotificationTools.innerHTML = generateUnsubscribeButtonTemplate();
      
      const unsubscribeButton = document.getElementById('unsubscribe-button');
      if (unsubscribeButton) {
        unsubscribeButton.addEventListener('click', async () => {
          await unsubscribe();
          await this.#setupPushNotificationTools(); // Refresh button
        });
      }
    } else {
      pushNotificationTools.innerHTML = generateSubscribeButtonTemplate();
      
      const subscribeButton = document.getElementById('subscribe-button');
      if (subscribeButton) {
        subscribeButton.addEventListener('click', async () => {
          await subscribe();
          await this.#setupPushNotificationTools(); // Refresh button
        });
      }
    }
  }

  async renderPage() {
    const url = getActiveRoute();
    const route = routes[url];

    const page = route();

    if (!page) {
      return;
    }

    const transition = transitionHelper({
      updateDOM: async () => {
        this.#content.innerHTML = await page.render();
        page.afterRender();
      },
    });

    transition.ready.catch(console.error);
    transition.updateCallbackDone.then(async () => {
      scrollTo({ top: 0, behavior: 'instant' });
      await this.#setupNavigationList();
    });
  }
}
