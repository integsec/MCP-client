# Changelog

## Version 1.0.0 - IntegSec Release

### Major Features

#### IntegSec Branding

- Added IntegSec splash screen on startup with ASCII logo (auto-closes after 2 seconds)
- IntegSec logo displayed in top-right corner of interface
- Proprietary licensing protecting commercial use
- Copyright notices throughout documentation

#### Enhanced Traffic Monitoring

- **Most recent traffic at top** - Latest entries appear first for easier monitoring
- **Detailed traffic information** including:
  - Timestamps (HH:MM:SS.mmm format)
  - Tool names and parameters for `tools/call`
  - URIs for `resources/read`
  - Prompt names for `prompts/get`
  - Error messages highlighted in red
  - Request IDs for tracking
- **Request/Response pairing** - Select any traffic entry to see matching request and response side-by-side
- **Color coding**:
  - Yellow (>>>) for sent requests
  - Green (<<<) for received responses
  - Red for errors

#### Function Key Navigation (IntegSec Standard)

All navigation now uses function keys for professional pentesting workflow:

- **F1** - Focus navigation sidebar
- **F2** - Focus main content panel
- **F3** - Focus traffic log panel
- **F4** - Close popup windows/dialogs
- **F5** - Refresh current view
- **F10** - Quit application

### Technical Improvements

#### Traffic Analysis

- Request/response pairs automatically matched by JSON-RPC ID
- Supports viewing either request or response to see the paired message
- Shows "(pending)" for requests without responses yet
- Full JSON formatting with syntax highlighting

#### UI/UX Enhancements

- Splash screen on startup with IntegSec branding
- Logo permanently visible in top-right corner
- Consistent function key usage across all panels
- Status bar shows all available function keys
- Popup windows clearly indicate F4 to close

### Licensing

This release includes a proprietary IntegSec license:

- Free for internal security testing and education
- Commercial use requires separate license
- No redistribution or derivative works allowed
- Full intellectual property protection

### Documentation Updates

All documentation updated with:

- IntegSec branding and copyright notices
- New function key shortcuts
- Traffic monitoring capabilities
- Request/response pairing features
- Licensing information

### Files Changed

**Core Application:**

- `src/ui/tui.ts` - Major UI updates for branding, function keys, and traffic display
- `package.json` - Updated with IntegSec author and proprietary license
- `LICENSE` - New proprietary license protecting commercial use

**Documentation:**

- `README.md` - IntegSec branding, new keyboard shortcuts
- `QUICKSTART.md` - Function keys, traffic features
- `CHANGELOG.md` - This file

**New Files:**

- `LICENSE` - IntegSec Proprietary Software License

### Migration Guide

If upgrading from a previous version:

1. **Keyboard shortcuts have changed:**
   - Old: Tab/Arrow keys for navigation
   - New: F1/F2/F3 function keys
   - Old: q to quit
   - New: F10 to quit
   - Old: Enter/Esc to close popups
   - New: F4 to close popups

2. **Traffic log behavior:**
   - Now shows most recent at top (reversed order)
   - More detailed information per entry
   - Can view request/response pairs

3. **Licensing:**
   - Review new LICENSE file
   - Commercial use now requires separate agreement
   - Contact licensing@integsec.com for commercial licenses

### Known Issues

None reported in this release.

### Future Enhancements

Planned for future releases:

- Traffic export to various formats (JSON, HAR, etc.)
- Traffic filtering and search
- Replay functionality for requests
- Automated fuzzing templates
- Multi-server session management

---

**Copyright © 2025 IntegSec. All Rights Reserved.**

For support: support@integsec.com
For licensing: licensing@integsec.com
For security issues: security@integsec.com
