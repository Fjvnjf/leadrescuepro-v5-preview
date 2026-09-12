(() => {
  const player = document.querySelector("[data-call-flow-player]");
  if (!player) return;

  const desktopVideo = player.querySelector('[data-variant="desktop"]');
  const mobileVideo = player.querySelector('[data-variant="mobile"]');
  const startButton = player.querySelector("[data-call-flow-start]");
  const playButton = player.querySelector("[data-call-flow-play]");
  const pauseButton = player.querySelector("[data-call-flow-pause]");
  const replayButton = player.querySelector("[data-call-flow-replay]");
  const nextButton = player.querySelector("[data-call-flow-next]");
  const scrubber = player.querySelector("[data-call-flow-scrubber]");
  const timeLabel = player.querySelector("[data-call-flow-time]");
  const stageNumber = player.querySelector("[data-call-flow-stage]");
  const stageTitle = player.querySelector("[data-call-flow-title]");
  const status = document.querySelector("#call-flow-status");
  const beats = [...document.querySelectorAll("[data-call-flow-beat]")];
  const routeTabs = [...document.querySelectorAll("[data-call-route]")];
  const routeDescription = document.querySelector("#call-route-description");
  const mobileQuery = window.matchMedia("(max-width: 700px)");
  const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  const steps = [
    "Caller reaches your AI number",
    "The homeowner says: No hot water.",
    "Your AI receptionist answers",
    "Issue, area, and urgency captured",
    "A callback preference is captured",
    "An example lead is ready for your team",
  ];
  const timings = {
    desktop: [0, 3.2, 6.2, 9.4, 15.2, 21.5],
    mobile: [0, 4.1, 8.2, 12.3, 16.4, 20.5],
  };
  const durations = { desktop: 26, mobile: 25 };
  const routes = {
    direct: "Direct calls reach the dedicated AI number directly.",
    overflow:
      "Selected overflow calls reach the AI number through configured forwarding.",
    afterhours:
      "After-hours calls reach the AI number through configured forwarding.",
  };
  let pendingSeek = null;
  let forcedStep = null;

  const activeVariant = () => (mobileQuery.matches ? "mobile" : "desktop");
  const activeVideo = () => (mobileQuery.matches ? mobileVideo : desktopVideo);
  const inactiveVideo = () => (mobileQuery.matches ? desktopVideo : mobileVideo);
  const formatTime = (seconds) => {
    const total = Math.max(0, Math.floor(seconds));
    return `00:${String(total).padStart(2, "0")}`;
  };
  const announce = (message) => {
    if (status) status.textContent = message;
  };
  const activeStep = (seconds) => {
    if (forcedStep !== null) return forcedStep;
    const points = timings[activeVariant()];
    let index = 0;
    points.forEach((point, candidate) => {
      if (seconds >= point - 0.12) index = candidate;
    });
    return index;
  };
  const updateStage = (seconds) => {
    const step = activeStep(seconds);
    if (stageNumber) stageNumber.textContent = String(step + 1).padStart(2, "0");
    if (stageTitle) stageTitle.textContent = steps[step];
    beats.forEach((beat, index) => {
      const current = index === step;
      beat.dataset.active = String(current);
      if (current) beat.setAttribute("aria-current", "step");
      else beat.removeAttribute("aria-current");
    });
  };
  const renderTime = (seconds) => {
    const duration = durations[activeVariant()];
    if (scrubber) scrubber.value = String(Math.min(seconds, duration));
    if (timeLabel) timeLabel.textContent = formatTime(seconds);
    updateStage(seconds);
  };
  const updateTime = () => {
    if (pendingSeek !== null || forcedStep !== null) return;
    const seconds = Number.isFinite(activeVideo().currentTime) ? activeVideo().currentTime : 0;
    renderTime(seconds);
  };
  const syncControls = () => {
    const playing = !activeVideo().paused && !activeVideo().ended;
    player.dataset.playing = String(playing);
    player.dataset.reduced = String(reducedQuery.matches);
    playButton.disabled = reducedQuery.matches || playing;
    pauseButton.disabled = !playing;
  };
  const seek = (seconds, afterSeek) => {
    const video = activeVideo();
    const duration = durations[activeVariant()];
    const apply = () => {
      const target = Math.min(Math.max(0, seconds), duration - 0.05);
      const targetStep = timings[activeVariant()].reduce(
        (current, point, index) => (target >= point ? index : current),
        0,
      );
      pendingSeek = target;
      forcedStep = targetStep;
      video.addEventListener(
        "seeked",
        () => {
          pendingSeek = null;
          if (Math.abs(video.currentTime - target) < 0.4) forcedStep = null;
          if (forcedStep === null) updateTime();
        },
        { once: true },
      );
      video.currentTime = target;
      player.dataset.started = "true";
      player.dataset.completed = "false";
      renderTime(target);
      if (afterSeek) afterSeek();
    };
    if (video.readyState >= 1) {
      apply();
    } else {
      video.addEventListener("loadedmetadata", apply, { once: true });
      video.load();
    }
  };
  const play = () => {
    if (reducedQuery.matches) {
      announce("Reduced motion is on. Use Next step to view the illustrated call one frame at a time.");
      return;
    }
    const video = activeVideo();
    inactiveVideo().pause();
    forcedStep = null;
    player.dataset.started = "true";
    player.dataset.completed = "false";
    video
      .play()
      .then(() => {
        announce("Playing the narrated plumbing-call example.");
        syncControls();
      })
      .catch(() => {
        announce("The illustrated call could not play. Use Next step to view each part.");
        syncControls();
      });
  };
  const pause = (message = "Example paused.") => {
    activeVideo().pause();
    syncControls();
    if (message) announce(message);
  };
  const replay = () => {
    if (reducedQuery.matches) {
      pendingSeek = null;
      forcedStep = 0;
      player.dataset.started = "false";
      player.dataset.completed = "false";
      renderTime(0);
      pause("Back at the first step. Use Next step to continue.");
      return;
    }
    seek(0, () => {
      play();
    });
  };
  const nextStep = () => {
    const current = activeStep(activeVideo().currentTime);
    const points = timings[activeVariant()];
    const next = current >= points.length - 1 ? 0 : current + 1;
    if (reducedQuery.matches) {
      pendingSeek = null;
      forcedStep = next;
      player.dataset.started = "true";
      player.dataset.completed = "false";
      renderTime(points[next]);
      announce(
        next === 0 && current >= points.length - 1
          ? "Back at the first step."
          : `Step ${next + 1} of ${points.length}: ${steps[next]}`,
      );
      return;
    }
    pause("");
    seek(points[next], () => {
      announce(
        next === 0 && current >= points.length - 1
          ? "Back at the first step."
          : `Step ${next + 1} of ${points.length}: ${steps[next]}`,
      );
    });
  };
  const resetForViewport = () => {
    desktopVideo.pause();
    mobileVideo.pause();
    const duration = durations[activeVariant()];
    player.dataset.started = "false";
    player.dataset.completed = "false";
    if (scrubber) {
      scrubber.max = String(duration);
      scrubber.value = "0";
      scrubber.setAttribute("aria-valuemax", String(duration));
    }
    if (timeLabel) timeLabel.textContent = "00:00";
    updateStage(0);
    syncControls();
    announce(
      reducedQuery.matches
        ? "Reduced motion is on. Use Next step to view the illustrated call."
        : "Illustrated example · Voiceover starts when you press play. No live calls or customer data.",
    );
  };
  const chooseRoute = (route) => {
    routeTabs.forEach((tab) => {
      const selected = tab.dataset.callRoute === route;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    if (routeDescription) routeDescription.textContent = routes[route];
  };

  [desktopVideo, mobileVideo].forEach((video) => {
    video.addEventListener("timeupdate", updateTime);
    video.addEventListener("play", syncControls);
    video.addEventListener("pause", syncControls);
    video.addEventListener("ended", () => {
      player.dataset.completed = "true";
      syncControls();
      announce("Example complete. Your team handles the callback, dispatch, and service.");
    });
  });
  startButton.addEventListener("click", play);
  playButton.addEventListener("click", play);
  pauseButton.addEventListener("click", () => pause());
  replayButton.addEventListener("click", replay);
  nextButton.addEventListener("click", nextStep);
  scrubber.addEventListener("input", () => {
    if (reducedQuery.matches) {
      const step = timings[activeVariant()].reduce(
        (current, point, index) => (Number(scrubber.value) >= point ? index : current),
        0,
      );
      forcedStep = step;
      player.dataset.started = "true";
      renderTime(timings[activeVariant()][step]);
      announce(`Viewing step ${step + 1} of ${steps.length}.`);
      return;
    }
    pause("");
    seek(Number(scrubber.value), () => {
      announce(`Viewing step ${activeStep(activeVideo().currentTime) + 1} of ${steps.length}.`);
    });
  });
  routeTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => chooseRoute(tab.dataset.callRoute));
    tab.addEventListener("keydown", (event) => {
      let target;
      if (event.key === "ArrowRight") target = (index + 1) % routeTabs.length;
      else if (event.key === "ArrowLeft") target = (index + routeTabs.length - 1) % routeTabs.length;
      else if (event.key === "Home") target = 0;
      else if (event.key === "End") target = routeTabs.length - 1;
      else return;
      event.preventDefault();
      routeTabs[target].focus();
      chooseRoute(routeTabs[target].dataset.callRoute);
    });
  });
  mobileQuery.addEventListener("change", resetForViewport);
  reducedQuery.addEventListener("change", resetForViewport);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && !activeVideo().paused) pause("");
  });
  new IntersectionObserver(
    (entries) => {
      if (!entries[0].isIntersecting && !activeVideo().paused) pause("");
    },
    { threshold: 0 },
  ).observe(player);
  chooseRoute("direct");
  resetForViewport();
})();
