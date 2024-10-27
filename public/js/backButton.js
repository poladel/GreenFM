function goBack() {
    const referrer = document.referrer;
    if (referrer && !referrer.includes('/Register')) {
      window.history.back();
    } else {
      window.location.href = '/'; // Redirect to homepage or another specific page
    }
  }