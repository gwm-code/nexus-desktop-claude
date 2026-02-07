# OAuth PKCE Flow Implementation

## ✅ What's Been Implemented

### CLI Side (Nexus)

**New Module:** `src/oauth.rs` - Complete PKCE OAuth flow
- ✅ PKCE code verifier and challenge generation
- ✅ Local HTTP server on port 8765 for OAuth callback
- ✅ Authorization URL generation for Google, Claude, OpenAI
- ✅ Token exchange with PKCE verification
- ✅ Token storage in config with expiration tracking
- ✅ OAuth status checking

**New Commands:**
```bash
nexus oauth authorize <provider>  # Start OAuth flow, opens browser
nexus oauth status <provider>     # Check if authorized
```

**Config Changes:**
- Added `oauth_expires_at` field to `ProviderConfig` (Unix timestamp)
- Tokens stored securely via existing secret store

**Dependencies Added:**
- `rand = "0.8"` - Random string generation
- `sha2 = "0.10"` - SHA256 for PKCE challenge
- `base64 = "0.22"` - Base64 encoding

### Desktop Side (Nexus Desktop)

**Tauri Backend Updated:**
- ✅ `oauth_authorize()` command calls `nexus oauth authorize`
- ✅ `oauth_check_status()` command calls `nexus oauth status`
- ✅ Removed `set_oauth_credentials()` (no longer needed)

**UI Changes Needed (Manual):**
The `SettingsModal.tsx` OAuth section needs simplification:
1. Remove `oauthClientId` and `oauthClientSecret` state variables
2. Remove `showOauthSecret` state variable
3. Simplify `handleOAuthAuthorize` function (see below)
4. Replace Client ID/Secret inputs with simple "Login" button

---

## 🔧 What You Need to Do

### 1. Register OAuth Applications (Required)

The current implementation has placeholder Client IDs. You need to:

#### **Google Cloud Console**
1. Go to: https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID
3. Application type: **Desktop app** or **Web application**
4. Authorized redirect URIs: `http://localhost:8765/callback`
5. Copy the **Client ID**
6. Update in `/root/clawd/projects/nexus/src/oauth.rs` line 38:
   ```rust
   client_id: "YOUR_ACTUAL_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
   ```

#### **Anthropic (Claude)**
1. Go to: https://console.anthropic.com/settings/workspaces
2. Create OAuth application
3. Redirect URI: `http://localhost:8765/callback`
4. Copy Client ID
5. Update in `src/oauth.rs` line 45:
   ```rust
   client_id: "YOUR_ACTUAL_ANTHROPIC_CLIENT_ID",
   ```

#### **OpenAI**
1. Go to: https://platform.openai.com/settings/organization/api-keys
2. Create OAuth app (if available)
3. Redirect URI: `http://localhost:8765/callback`
4. Update in `src/oauth.rs` line 52:
   ```rust
   client_id: "YOUR_ACTUAL_OPENAI_CLIENT_ID",
   ```

**Note:** OAuth URLs for Claude and OpenAI might be incorrect. Verify the actual OAuth endpoints from their documentation.

---

### 2. Simplify Desktop UI (Optional but Recommended)

**Current UI:** Requires manual Client ID/Secret entry
**Desired UI:** Simple "Login with Google" button

**Update `SettingsModal.tsx`:**

Remove these state variables (around line 188-193):
```typescript
// DELETE THESE:
const [oauthClientId, setOauthClientId] = useState('');
const [oauthClientSecret, setOauthClientSecret] = useState('');
const [showOauthSecret, setShowOauthSecret] = useState(false);
```

Simplify `handleOAuthAuthorize` function (around line 251):
```typescript
const handleOAuthAuthorize = async () => {
  setAuthorizingOAuth(true);
  try {
    // Just call the backend - it handles everything
    const result: string = await invoke('oauth_authorize', { provider: activeProvider });

    // Refresh OAuth status
    const status: {authorized: boolean; expiresAt?: string} = await invoke('oauth_check_status', { provider: activeProvider });
    setOauthStatus(status);

    useNexusStore.getState().addToast({
      type: 'success',
      title: 'OAuth Authorized!',
      message: `Successfully authorized ${activeProvider}`
    });
  } catch (e) {
    useNexusStore.getState().addToast({
      type: 'error',
      title: 'OAuth Failed',
      message: String(e)
    });
  } finally {
    setAuthorizingOAuth(false);
  }
};
```

Replace the OAuth UI section (lines 386-471) with:
```typescript
{oauthStatus?.authorized ? (
  <div className="space-y-2">
    <div className="flex items-center gap-2 text-xs text-green-400">
      <Check className="w-4 h-4" />
      <span>Authorized</span>
      {oauthStatus.expiresAt && (
        <span className="text-zinc-500">
          • Expires: {new Date(oauthStatus.expiresAt).toLocaleDateString()}
        </span>
      )}
    </div>
    <p className="text-[10px] text-zinc-400">
      You're authenticated and ready to use {
        activeProvider === 'google' ? 'Google' :
        activeProvider === 'claude' ? 'Anthropic Claude' :
        'OpenAI'
      }
    </p>
  </div>
) : (
  <>
    <p className="text-[10px] text-blue-300">
      Click below to securely authenticate. Your browser will open for login.
    </p>

    <button
      onClick={handleOAuthAuthorize}
      disabled={authorizingOAuth}
      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
    >
      {authorizingOAuth ? (
        <>
          <RotateCcw className="w-4 h-4 animate-spin" />
          Authorizing...
        </>
      ) : (
        <>
          <Shield className="w-4 h-4" />
          Login with {
            activeProvider === 'google' ? 'Google' :
            activeProvider === 'claude' ? 'Anthropic' :
            'OpenAI'
          }
        </>
      )}
    </button>
  </>
)}
```

---

### 3. Test the OAuth Flow

#### **From Desktop:**
1. Open Settings → Provider tab
2. Select "google" as provider
3. Click "Login with Google"
4. Browser should open to Google login
5. After login, redirects to `http://localhost:8765/callback`
6. Desktop shows "OAuth Authorized!" toast
7. Status bar updates to show authenticated provider

#### **From CLI:**
```bash
# Start OAuth flow
nexus oauth authorize google

# Opens browser → login → callback received → token saved

# Check status
nexus oauth status google
# Output: ✅ Provider google is authorized, Expires at: 2026-03-15...
```

---

## 🐛 Known Issues & TODOs

### Critical (Must Fix):
1. **OAuth Client IDs are placeholders** - Need to register real OAuth apps
2. **Claude/OpenAI OAuth URLs might be wrong** - Verify from official docs
3. **Port 8765 might conflict** - Consider making it configurable

### Nice-to-Have:
1. **Token refresh** - Implement OAuth token refresh flow
2. **Logout button** - Add UI to revoke/clear OAuth tokens
3. **Error handling** - Better error messages for OAuth failures
4. **Timeout handling** - What if user closes browser without completing auth?

---

## 📚 How the PKCE Flow Works

1. **User clicks "Login with Google"**
2. **CLI generates:**
   - Code verifier (random 32-char string)
   - Code challenge (SHA256 hash of verifier, base64-encoded)
   - State (random 16-char string for CSRF protection)
3. **CLI starts local HTTP server** on port 8765
4. **CLI opens browser** to:
   ```
   https://accounts.google.com/o/oauth2/v2/auth?
     client_id=NEXUS_CLIENT_ID
     &redirect_uri=http://localhost:8765/callback
     &response_type=code
     &scope=openid email profile
     &state=RANDOM_STATE
     &code_challenge=SHA256_HASH
     &code_challenge_method=S256
   ```
5. **User logs in** with Google email/password
6. **Google redirects** browser to:
   ```
   http://localhost:8765/callback?code=AUTH_CODE&state=RANDOM_STATE
   ```
7. **CLI receives callback**, validates state, extracts code
8. **CLI exchanges code for token:**
   ```
   POST https://oauth2.googleapis.com/token
   Body: grant_type=authorization_code
         &code=AUTH_CODE
         &redirect_uri=http://localhost:8765/callback
         &client_id=NEXUS_CLIENT_ID
         &code_verifier=ORIGINAL_VERIFIER
   ```
9. **Google returns** access token + refresh token
10. **CLI saves tokens** to config with expiration timestamp

---

## 🎯 Benefits Over Previous Implementation

**Before:**
- User must manually create OAuth app
- User must copy/paste Client ID + Secret
- Confusing, error-prone

**After:**
- Nexus provides OAuth app
- User just clicks "Login with Google"
- Modern, seamless UX like VS Code/GitHub CLI

---

## 🚀 Next Steps

1. ✅ CLI OAuth module implemented
2. ✅ Tauri commands updated
3. ⏳ Register OAuth applications (Google, Claude, OpenAI)
4. ⏳ Update Client IDs in `oauth.rs`
5. ⏳ Simplify SettingsModal UI
6. ⏳ Test OAuth flow end-to-end
7. ⏳ Build AppImage and distribute

**Current status:** CLI is ready, Desktop needs Client ID updates + minor UI tweaks.
