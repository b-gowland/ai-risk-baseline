/**
 * Plausible Analytics wrapper. A no-op when Plausible has not loaded.
 *
 * The Plausible site (airiskpractice.org) is shared with the practice
 * scenarios app and the reference library. These are the only custom events
 * the Baseline sends. The privacy section of /disclaimer lists each one, and
 * scripts/tests/privacy-claims.test.js checks the list, the code and that
 * page against each other. Add an event here, use it, and list it there.
 */

export function trackEvent(name, props) {
  if (typeof window !== `undefined` && window.plausible) {
    window.plausible(name, props ? { props } : undefined)
  }
}

export const events = {
  EXAMPLES_GALLERY_VIEWED: `examples_gallery_viewed`, // /examples opened
  EXAMPLE_VIEWED:          `example_viewed`,          // a worked example opened; props: example_id
  CHANGELOG_VIEWED:        `changelog_viewed`,        // /changelog opened
}

// The only event properties sent, by event. example_id is a scenario id such
// as G09, never anything the user typed.
export const eventProps = {
  [events.EXAMPLES_GALLERY_VIEWED]: [],
  [events.EXAMPLE_VIEWED]:          [`example_id`],
  [events.CHANGELOG_VIEWED]:        [],
}
