# HC-demo

Hilscher-Clarke onboarding SCORM package — sample module for Canvas LMS.

## Folder Structure

```
├── scorm/                              # SCORM 1.2 package files
│   ├── index.html                      # Main content (9-screen onboarding module)
│   ├── scorm_api.js                    # SCORM 1.2 API wrapper
│   ├── imsmanifest.xml                 # SCORM 1.2 manifest
│   ├── metadata.xml                    # Learning object metadata (IMS LOM)
│   └── scorm_hc_onboarding_welcome.zip # Ready-to-upload SCORM package
├── examples/                           # Standalone HTML previews
│   └── hc-onboarding-preview.html      # Browser-viewable preview (no LMS needed)
└── README.md
```

## Module Overview

**Welcome to Hilscher-Clarke — First-Year Onboarding**

- 9 screens: Hero, History, Core Values, Services, Safety, Team, Match the Values game, Knowledge Check, Completion
- FIRST THINGS FIRST matching game with click-to-match UX
- 4-question knowledge check with immediate per-question feedback
- 75% mastery threshold
- Light/dark mode toggle
- Font Awesome 6.5.1 icons
- SCORM 1.2 compliant with full state persistence
- Estimated completion: 15 minutes

## Uploading to Canvas

1. Download `scorm/scorm_hc_onboarding_welcome.zip`
2. In Canvas, go to the course > Modules > Add Item > External Tool or upload as a SCORM package
3. The mastery score is set to 75 in the manifest

## Local Preview

Open `examples/hc-onboarding-preview.html` in any browser to preview the module without an LMS. Progress is saved to localStorage.
