// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAUKc3uT6k8f4vX0Xw6LCZzo4AhCTDs3mY",
  authDomain: "megavent3b356.firebaseapp.com",
  projectId: "megavent3b356",
  storageBucket: "megavent3b356.appspot.com",
  messagingSenderId: "421825036732",
  appId: "1:421825036732:android:0e6249e415458b54ebb9",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

class MegaVentQRHandler {
  constructor() {
    this.eventId = null;
    this.autoRegister = false;
    this.appScheme = "megavent://";
    this.appStoreUrl =
      "https://www.mediafire.com/file/cag5w7rvi38kauw/MegaVent.apk/file";
    this.eventData = null;
    this.init();
  }

  init() {
    // Parse URL parameters
    this.parseUrlParams();

    // Show event info if available
    this.displayEventInfo();

    // Start the app detection process
    setTimeout(() => {
      this.handleAppDetection();
    }, 3000); // Wait 3 seconds to show event details
  }

  parseUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    this.eventId = urlParams.get("eventId") || urlParams.get("eventid");
    this.autoRegister =
      urlParams.get("autoRegister") === "true" ||
      urlParams.get("autoregister") === "true";

    console.log("Parsed params:", {
      eventId: this.eventId,
      autoRegister: this.autoRegister,
    });
  }

  async displayEventInfo() {
    if (!this.eventId) {
      setTimeout(() => {
        this.showError("Invalid event link. Event ID is missing.");
      }, 2000);
      return;
    }

    // Show loading initially
    this.updateLoadingStatus("Loading event details...");

    try {
      // Fetch event details from Firestore
      const eventDoc = await db.collection("events").doc(this.eventId).get();

      if (!eventDoc.exists) {
        this.showError("Event not found or no longer available.");
        return;
      }

      this.eventData = eventDoc.data();

      // Format and display event details
      document.getElementById("eventTitle").textContent =
        this.eventData.name || "Event Registration";

      // Format dates
      let dateText = "Event date not available";
      if (this.eventData.startDate && this.eventData.endDate) {
        const startDate = this.eventData.startDate.toDate();
        const endDate = this.eventData.endDate.toDate();

        if (startDate.toDateString() === endDate.toDateString()) {
          dateText = startDate.toDateString();
        } else {
          dateText = `${startDate.toDateString()} - ${endDate.toDateString()}`;
        }
      }
      document.getElementById("eventDate").textContent = dateText;

      // Format time
      let timeText = "Time not available";
      if (this.eventData.startTime && this.eventData.endTime) {
        timeText = `${this.eventData.startTime} - ${this.eventData.endTime}`;
      } else if (this.eventData.startTime) {
        timeText = this.eventData.startTime;
      }
      document.getElementById("eventTime").textContent = timeText;

      // Location
      document.getElementById("eventLocation").textContent =
        this.eventData.location || "Location not specified";

      // Capacity info
      let capacityText = "Capacity not specified";
      if (this.eventData.maxCapacity) {
        const registered = this.eventData.registeredCount || 0;
        const available = this.eventData.maxCapacity - registered;
        capacityText = `${available} spots available (${registered}/${this.eventData.maxCapacity})`;
      }
      document.getElementById("eventCapacity").textContent = capacityText;

      document.getElementById("eventInfo").classList.remove("hidden");

      // Update loading status
      this.updateLoadingStatus("Preparing to open MegaVent app...");
    } catch (error) {
      console.error("Error fetching event:", error);
      this.showError(
        "Failed to load event details. Please check your internet connection."
      );
    }
  }

  async handleAppDetection() {
    try {
      // Update status
      this.updateLoadingStatus("Opening MegaVent app...");

      // Try to open the app with improved detection
      const appOpened = await this.tryOpenApp();

      if (!appOpened) {
        // App not installed or didn't open, show download option
        this.handleAppNotInstalled();
      } else {
        this.showSuccess("MegaVent app is opening...");
      }
    } catch (error) {
      console.error("Error in app detection:", error);
      this.handleAppNotInstalled();
    }
  }

  async tryOpenApp() {
    return new Promise((resolve) => {
      const deepLink = `${this.appScheme}register?eventId=${this.eventId}&autoRegister=${this.autoRegister}`;

      console.log("Attempting to open app with deep link:", deepLink);

      // Track if user leaves the page (app opened)
      let hasLeft = false;
      let resolved = false;

      const handleVisibilityChange = () => {
        if (document.hidden && !resolved) {
          hasLeft = true;
          resolved = true;
          console.log("Page became hidden - app likely opened");
          resolve(true);
        }
      };

      const handleBlur = () => {
        if (!resolved) {
          hasLeft = true;
          resolved = true;
          console.log("Window lost focus - app likely opened");
          resolve(true);
        }
      };

      const handleFocus = () => {
        // If user returns quickly, app might not be installed
        setTimeout(() => {
          if (!hasLeft && !resolved) {
            resolved = true;
            console.log("User returned quickly - app might not be installed");
            resolve(false);
          }
        }, 100);
      };

      // Add event listeners
      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("blur", handleBlur);
      window.addEventListener("focus", handleFocus);

      // Try multiple methods to open the app

      // Method 1: Create hidden iframe
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = deepLink;
      document.body.appendChild(iframe);

      // Method 2: Direct window location (after short delay)
      setTimeout(() => {
        if (!resolved) {
          console.log("Trying window.location method");
          window.location.href = deepLink;
        }
      }, 250);

      // Method 3: Create a temporary anchor element
      setTimeout(() => {
        if (!resolved) {
          console.log("Trying anchor click method");
          const link = document.createElement("a");
          link.href = deepLink;
          link.style.display = "none";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }, 500);

      // Final timeout - if user hasn't left within 2.5 seconds, assume app isn't installed
      setTimeout(() => {
        // Clean up event listeners
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
        window.removeEventListener("blur", handleBlur);
        window.removeEventListener("focus", handleFocus);

        // Clean up iframe safely
        if (iframe && iframe.parentNode) {
          document.body.removeChild(iframe);
        }

        if (!resolved) {
          resolved = true;
          console.log("Timeout reached - app likely not installed");
          resolve(false);
        }
      }, 2500);
    });
  }

  handleAppNotInstalled() {
    this.hideLoading();

    // Show download and retry options
    this.showActionButtons();
    this.showError(
      'MegaVent app is not installed on your device. Please download and install the app, then scan the QR code again or click "Try Again" below.'
    );
  }

  showActionButtons() {
    const actionButtons = document.getElementById("actionButtons");
    const openAppBtn = document.getElementById("openAppBtn");
    const downloadBtn = document.getElementById("downloadBtn");

    // Set up retry button
    openAppBtn.onclick = () => {
      this.showLoading();
      this.hideMessages();
      setTimeout(() => {
        this.handleAppDetection();
      }, 500);
    };

    // Download button is already configured in HTML
    actionButtons.classList.remove("hidden");
  }

  showLoading() {
    document.getElementById("loadingContainer").classList.remove("hidden");
    this.updateLoadingStatus("Checking for MegaVent app...");
  }

  hideLoading() {
    document.getElementById("loadingContainer").classList.add("hidden");
  }

  hideMessages() {
    document.getElementById("errorMessage").classList.add("hidden");
    document.getElementById("successMessage").classList.add("hidden");
    document.getElementById("actionButtons").classList.add("hidden");
  }

  updateLoadingStatus(message) {
    const statusElement = document.getElementById("loadingStatus");
    if (statusElement) {
      statusElement.textContent = message;
    }
  }

  showError(message) {
    this.hideLoading();
    const errorElement = document.getElementById("errorMessage");
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.classList.remove("hidden");
    }
  }

  showSuccess(message) {
    this.hideLoading();
    const successElement = document.getElementById("successMessage");
    if (successElement) {
      successElement.textContent = message;
      successElement.classList.remove("hidden");
    }
  }
}

// Initialize when page loads
document.addEventListener("DOMContentLoaded", () => {
  new MegaVentQRHandler();
});

// Handle page visibility change (detect when user returns from app)
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    console.log("User returned to browser");
    // Optional: Show a message or update UI when user returns
  }
});

// Prevent any layout shifts by ensuring elements are properly handled
window.addEventListener("load", () => {
  // Ensure all images are loaded and container height is stable
  const images = document.querySelectorAll("img");
  images.forEach((img) => {
    if (!img.complete) {
      img.addEventListener("load", () => {
        console.log("Image loaded, layout should be stable");
      });
    }
  });
});
