import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './InstallPage.css';

export default function InstallPage() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isAlreadyInstalled, setIsAlreadyInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

    if (isStandalone) {
      setIsAlreadyInstalled(true);
      return;
    }

    // Detect device type
    const ua = navigator.userAgent.toLowerCase();
    const deviceIsIos = /iphone|ipad|ipod/.test(ua) && !window.MSStream;
    const deviceIsAndroid = /android/.test(ua);

    setIsIos(deviceIsIos);
    setIsAndroid(deviceIsAndroid);

    // Handle beforeinstallprompt for Android
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setCanInstall(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;

    setDeferredPrompt(null);
    setCanInstall(false);
  };

  if (isAlreadyInstalled) {
    return (
      <div className="page-wrap">
        <div className="install-card install-success">
          <div className="install-icon install-icon-success">✓</div>
          <h1>Wise Gourmet is Installed!</h1>
          <p>You're all set. The app is ready to use from your home screen.</p>
          <button onClick={() => navigate('/')} className="install-button install-button-primary">
            Go to Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrap">
      <div className="install-container">
        <div className="install-header">
          <div className="install-logo">🍃</div>
          <h1>Get Wise Gourmet as an App</h1>
          <p>Install on your phone for quick access and offline support</p>
        </div>

        {isAndroid && canInstall && (
          <div className="install-card install-card-android">
            <div className="install-icon install-icon-android">📱</div>
            <h2>Install Now</h2>
            <p>Tap the button below to add Wise Gourmet to your phone's home screen.</p>
            <button onClick={handleInstallClick} className="install-button install-button-primary">
              Install App
            </button>
          </div>
        )}

        {isIos && (
          <div className="install-card install-card-ios">
            <div className="install-icon install-icon-ios">📲</div>
            <h2>Install for iOS</h2>
            <p>Follow these simple steps:</p>
            <ol className="install-steps">
              <li>
                Tap the <strong>Share</strong> button at the bottom of Safari
              </li>
              <li>
                Scroll down and tap <strong>Add to Home Screen</strong>
              </li>
              <li>
                Tap <strong>Add</strong> in the top right corner
              </li>
            </ol>
            <div className="install-tip">
              <strong>💡 Tip:</strong> Open this link in Safari to see the install option
            </div>
            <button onClick={() => navigate('/')} className="install-button install-button-secondary">
              Open Menu
            </button>
          </div>
        )}

        {!isAndroid && !isIos && (
          <div className="install-card install-card-desktop">
            <div className="install-icon install-icon-desktop">💻</div>
            <h2>Desktop View</h2>
            <p>It looks like you're on a desktop or the device type couldn't be detected.</p>
            <p className="install-hint">
              On Android: Use Chrome and look for the install prompt in the browser menu.
              <br />
              On iPhone: Open this link in Safari and use Share → Add to Home Screen.
            </p>
            <button onClick={() => navigate('/')} className="install-button install-button-secondary">
              Back to Menu
            </button>
          </div>
        )}

        {isAndroid && !canInstall && (
          <div className="install-card install-card-android">
            <div className="install-icon install-icon-android">📱</div>
            <h2>Ready to Install?</h2>
            <p>
              The app can be installed on your Android device. If you don't see an install option, try reloading
              the page.
            </p>
            <button onClick={() => window.location.reload()} className="install-button install-button-secondary">
              Reload Page
            </button>
            <button onClick={() => navigate('/')} className="install-button install-button-ghost">
              Continue Browsing
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
