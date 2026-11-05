#!/usr/bin/env bash
# Installs what test/tools/browser-smoke.js needs on a GitHub Actions Ubuntu runner: Playwright's Chromium, Firefox
# and WebKit with their system libraries, and Mesa's software OpenGL (Firefox's WebGL under xvfb-run).
# The runner's apt mirror sometimes slows to a trickle mid-download (a 9 MB package still going after minutes),
# which left the step hanging until the job was cancelled. So apt gives up on a stalled download and retries it,
# and each attempt is cut off after 5 minutes and started again, at most three times.
set -uo pipefail
sudo tee /etc/apt/apt.conf.d/99-ci-network >/dev/null <<'EOF'
Acquire::http::Timeout "30";
Acquire::https::Timeout "30";
Acquire::Retries "5";
EOF
install() {
  npx playwright install --with-deps chromium firefox webkit &&
    sudo apt-get install -y --no-install-recommends libgl1-mesa-dri libegl-mesa0 libglx-mesa0
}
for attempt in 1 2 3; do
  # timeout signals its whole process group, so apt-get under sudo stops too
  if timeout --kill-after=20 "${ATTEMPT_SECONDS:-300}" bash -c "$(declare -f install); install"; then exit 0; fi
  echo "::warning::Browser install attempt $attempt failed or ran over 5 minutes; retrying"
  # an interrupted install may leave dpkg half-configured
  sudo dpkg --configure -a || true
done
echo "::error::Browser install failed three times"
exit 1
