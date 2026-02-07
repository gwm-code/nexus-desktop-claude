# Update Plan Summary - Key Changes

## 🎯 Major Improvements Based on User Feedback

### 1. **User Control Philosophy** ✅
**"The more the user has say, the better the app is"**

**Implementation:**
- Presets are **suggestions, not restrictions**
- Model dropdowns show:
  - ⭐ **Recommended models** at top (based on task category)
  - All available models below (user can pick ANY model)
- Users can override any tier with any model
- No forced limitations - full freedom

**Example:**
```
Coding Tier 1 Dropdown:
├─ ⭐ Recommended for Coding
│  ├─ Gemini-3-Pro (Best overall)
│  ├─ GPT-5.1 (Creative solutions)
│  └─ Claude Opus 4.6 (Clean code)
└─ All Available Models
   ├─ Gemini-3-Flash (Speed)
   ├─ Grok-4.1-Thinking (Reasoning)
   ├─ openrouter/auto:free (Free)
   └─ ... (all other models)
```

---

### 2. **Real-Time Model Rankings** 📊
**Data Sources Confirmed:**

From `/root/clawd/projects/nexus/AI-Model-Rankings-Feb-2026.md`:

1. **OpenLM Arena** (openlm.ai) - 6M+ votes, Elo ratings
2. **LMSYS Chatbot Arena** - Weekly leaderboard updates
3. **Epoch Capabilities Index** - 39 benchmark aggregation
4. **Scale SEAL** - Expert evaluations

**February 2026 Top Models:**
```
🥇 Gemini-3-Pro (1492 Elo) - Vision + long-context leader
🥈 Claude Opus 4.6 (1490 Elo) - Code quality + reasoning
🥉 Grok-4.1-Thinking (1482 Elo) - Complex reasoning surge
```

**Key Trends:**
- Gemini-3-Pro took #1 from GPT-5.2
- Chinese models (Qwen3-Max, Kimi-K2.5) surging
- "Thinking" variants dominate reasoning tasks
- Open-source (GLM-4.7) matching commercial models

---

### 3. **Updated Model Database** 🗄️

**Models to Add (Priority):**
- ✅ Gemini-3-Pro, Gemini-3-Flash
- ✅ Grok-4.1-Thinking, Grok-4.1
- ✅ GPT-5.2, GPT-5.1
- ⚠️ Kimi-K2.5-Thinking (1451 Elo)
- ⚠️ GLM-4.7 (1445 Elo) - Best open-source
- ⚠️ Qwen3-Max (1443 Elo) - Self-hosting

**Category Leaders:**
- **Coding:** Gemini-3-Pro, GPT-5.1, Claude Opus 4.6
- **Reasoning:** Grok-4.1-Thinking, Claude Opus 4.6, Gemini-3-Pro
- **Vision:** Gemini-3-Pro, Claude Opus 4.5, Grok-4.1
- **Speed:** Gemini-3-Flash, Kimi-K2.5, GLM-4.7

**Scores (speed/reasoning/coding):**
```
Gemini-3-Pro:       7 / 10 / 10  ($1.25/1M tokens)
Claude Opus 4.6:    5 / 10 / 10  ($15.00/1M tokens)
Grok-4.1-Thinking:  4 / 10 / 8   ($8.00/1M tokens)
Gemini-3-Flash:    10 / 8  / 8   ($0.08/1M tokens)
Kimi-K2.5:         8 / 9  / 7   ($0.50/1M tokens)
GLM-4.7:           9 / 7  / 7   ($0.10/1M tokens)
```

---

## 📋 Full Feature List (10-12 days)

| Priority | Feature | Time | Status |
|----------|---------|------|--------|
| 1 | OAuth (Google, Claude, OpenAI) | 2 days | Planned |
| 2 | OpenRouter Free (auto model) | 0.5 days | Planned |
| 3 | Settings Logs Tab | 1 day | Planned |
| 4 | Proactive Heartbeat (0-24h) | 1.5 days | Planned |
| **5** | **Model Hierarchy System** | **3-4 days** | **Planned** |
| 6 | Nice-to-Have Improvements | 2 days | Planned |

---

## 🎯 Model Hierarchy System (Detailed)

### Core Features:
1. **5 Task Categories:**
   - Heartbeat (proactive checks)
   - Daily (simple queries)
   - Planning (architecture, design)
   - Coding (implementation)
   - Review (validation, testing)

2. **3 Tiers per Category:**
   - Tier 1: First attempt (usually faster/cheaper)
   - Tier 2: Auto-escalation if Tier 1 fails
   - Tier 3: Final escalation (premium models)

3. **Smart Presets:**
   - Budget (minimize cost)
   - Balanced (quality + cost) ← DEFAULT
   - Premium (best quality)
   - Speed (fastest models)
   - Claude-Only (for Claude fans)
   - Custom (user builds from scratch)

4. **Auto-Escalation:**
   - Triggers: API errors, refusals, syntax errors, test failures
   - Max escalations: Configurable (default: 3)
   - Budget guard: Daily spend limit
   - User sees toast: "Task failed with Gemini, retrying with Claude..."

5. **Cost Tracking:**
   - Real-time cost estimation
   - Daily spend tracking
   - Escalation rate statistics
   - Budget alerts

### UI Flow:
1. User selects preset OR builds custom hierarchy
2. For each category, picks 1-3 models (from sorted dropdown)
3. Configures auto-escalation policy
4. Sets daily budget limit
5. Saves configuration
6. Agent uses hierarchy for all tasks
7. User sees stats (cost, escalations) in Settings

---

## 🚀 Implementation Notes

### Ranking Updates:
- **Static baseline:** Embed current rankings in binary
- **Optional dynamic:** Weekly fetch from GitHub JSON
- **Community-driven:** Users can submit PRs to update rankings

### Model Discovery:
- Query each configured provider for available models
- Filter by authentication (OAuth or API key)
- Dropdown shows only models user can actually use

### Preset Logic:
```rust
fn apply_preset(preset: PresetType, available_models: Vec<String>) {
    // 1. Filter models user has access to
    // 2. Rank models by category (coding, reasoning, speed)
    // 3. Populate tiers with top-ranked models
    // 4. User can override any selection
}
```

---

## ✅ Next Steps

1. **Implement OAuth** (Google, Claude, OpenAI)
2. **Add OpenRouter auto:free** support
3. **Build Settings Logs Tab**
4. **Implement Proactive Heartbeat**
5. **Build Model Hierarchy System** (biggest feature)
6. **Polish UX** (nice-to-have improvements)
7. **Test end-to-end**
8. **Build AppImage**

---

**Ready to start implementation when you are!** 🚀
