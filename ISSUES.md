# 🐛 BUG TRACKING & FIXES
## Outreach.ai - Critical Issues Requiring Immediate Attention

**PRIORITY: HIGH** - All issues below must be fixed with minimal code changes and maximum impact.

**CRITICAL REQUIREMENTS:**
- **SSR Compliance** - All fixes must maintain Next.js Server-Side Rendering patterns
- **Performance** - Fixes must not degrade page load times or API response times
- **Security** - All fixes must maintain security best practices and input validation

---

## 🚨 CRITICAL BUGS (Fix Immediately)

### **Issue #1: Tone Selection Synchronization Bug**
**Status:** ✅ FIXED  
**Priority:** HIGH  
**Impact:** User confusion, poor UX

**Problem:**
- User selects "Conversational" tone in search panel
- Research output shows "Formal" tone in Email/LinkedIn dropdowns
- This confuses users and breaks the expected workflow

**Root Cause:**
- Tone state is not properly synchronized between search panel and output components
- `searchTone` state is not being passed to `emailTone` and `linkedinTone` states

**Required Fix:**
```typescript
// In dashboard-client.tsx, update runChain function:
const runChain = async () => {
  // ... existing code ...
  
  // CRITICAL: Sync tone selection
  setEmailTone(searchTone);
  setLinkedinTone(searchTone);
  
  // ... rest of function
};
```

**Files to Modify:**
- `app/dashboard/dashboard-client.tsx` (lines ~200-250)

**Testing:**
- [ ] Select "Conversational" tone → Generate → Verify both Email and LinkedIn show "Conversational"
- [ ] Select "Intellectual" tone → Generate → Verify both Email and LinkedIn show "Intellectual"
- [ ] Test all tone combinations

---

### **Issue #2: Cold Email Greeting Bug**
**Status:** ✅ FIXED  
**Priority:** HIGH  
**Impact:** Unprofessional messages, poor personalization

**Problem:**
- Warm & Personal tone emails show incorrect recipient addressing
- Messages appear generic and unprofessional

**Root Cause:**
- `messagingAgent` system prompt not handling tone-specific greetings properly
- Contact name extraction not working correctly for warm tones

**Required Fix:**
```typescript
// In lib/messagingAgent.ts, update system prompt:
const systemPrompt = `
You are a professional outreach specialist. Generate personalized cold emails.

TONE-SPECIFIC GREETINGS:
- Warm & Personal: "Hi [Name]," or "Hello [Name],"
- Conversational: "Hey [Name]," or "Hi [Name],"
- Intellectual: "Dear [Name]," or "Hello [Name],"
- Formal: "Dear [Name]," or "Dear [Name],"

CONTACT NAME HANDLING:
- Always use the contact's actual name when available
- If no name available, use "Hi there," as fallback
- Never use generic greetings like "Hi there" when name is available
`;
```

**Files to Modify:**
- `lib/messagingAgent.ts` (system prompt section)

**Testing:**
- [ ] Generate email with Warm & Personal tone → Verify proper greeting
- [ ] Test with and without contact name
- [ ] Verify all tone-specific greetings work correctly

---

### **Issue #3: LinkedIn Message Greeting Bug**
**Status:** ✅ FIXED  
**Priority:** HIGH  
**Impact:** Unprofessional messages, poor personalization

**Problem:**
- Intellectual and Conversational LinkedIn messages show "Hi there" instead of proper greetings
- Messages appear generic and unprofessional

**Root Cause:**
- `validateLinkedInMessage` function removing proper greetings
- System prompt not generating tone-appropriate LinkedIn greetings

**Required Fix:**
```typescript
// In lib/messagingAgent.ts, update LinkedIn validation:
const validateLinkedInMessage = (message: string) => {
  let validated = message.trim();
  
  // Remove generic fallbacks but keep proper greetings
  validated = validated.replace(/^(Hi there,?|Hello there,?)\s*/i, '');
  
  // Ensure proper greeting format
  if (!validated.match(/^(Hi|Hey|Hello|Dear)\s+\[?[A-Za-z\s]+\]?[,:]?/i)) {
    validated = `Hi [Name],\n\n${validated}`;
  }
  
  return validated;
};
```

**Files to Modify:**
- `lib/messagingAgent.ts` (validateLinkedInMessage function)

**Testing:**
- [ ] Generate LinkedIn message with Intellectual tone → Verify proper greeting
- [ ] Generate LinkedIn message with Conversational tone → Verify proper greeting
- [ ] Test with and without contact name

---

### **Issue #4: Regenerate Button State Bug**
**Status:** ✅ FIXED  
**Priority:** HIGH  
**Impact:** Unnecessary API calls, rate limiting, poor UX

**Problem:**
- Clicking "Regenerate Email" also regenerates LinkedIn message
- This wastes API tokens and can cause rate limiting
- Users expect independent regeneration

**Root Cause:**
- `regenerateEmail` and `regenerateLinkedin` functions not properly isolated
- Missing `messageType` parameter in API calls

**Required Fix:**
```typescript
// In dashboard-client.tsx, update regenerate functions:
const regenerateEmail = async () => {
  setRegeneratingEmail(true);
  try {
    const response = await fetch('/api/messaging', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company: company,
        role: role,
        highlights: highlights,
        tone: emailTone,
        messageType: 'email' // CRITICAL: Only generate email
      }),
    });
    
    const data = await response.json();
    if (data.email) {
      setEmail(data.email);
      setEditableEmail(data.email);
    }
  } catch (error) {
    console.error('Email regeneration failed:', error);
  } finally {
    setRegeneratingEmail(false);
  }
};

const regenerateLinkedin = async () => {
  setRegeneratingLinkedin(true);
  try {
    const response = await fetch('/api/messaging', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company: company,
        role: role,
        highlights: highlights,
        tone: linkedinTone,
        messageType: 'linkedin' // CRITICAL: Only generate LinkedIn
      }),
    });
    
    const data = await response.json();
    if (data.linkedin) {
      setLinkedin(data.linkedin);
      setEditableLinkedin(data.linkedin);
    }
  } catch (error) {
    console.error('LinkedIn regeneration failed:', error);
  } finally {
    setRegeneratingLinkedin(false);
  }
};
```

**Files to Modify:**
- `app/dashboard/dashboard-client.tsx` (regenerate functions)
- `app/api/messaging/route.ts` (handle messageType parameter)

**Testing:**
- [ ] Generate initial messages → Click "Regenerate Email" → Verify only email changes
- [ ] Click "Regenerate LinkedIn" → Verify only LinkedIn changes
- [ ] Monitor network requests → Verify targeted API calls

---

## 🎨 UI/UX BUGS (Fix for Better UX)

### **Issue #9: Resume Data Synchronization Bug**
**Status:** ✅ FIXED  
**Priority:** HIGH  
**Impact:** Resume data not syncing between search panel and dashboard

**Problem:**
- Resume upload from search panel not instantly available on dashboard
- Resume delete/replace operations not synced between components
- Manual refresh required to see resume changes
- Independent state management causing data inconsistency

**Root Cause:**
- ResumeViewer component had independent state management
- No real-time synchronization between components
- Missing refresh triggers and parent state communication
- No database subscriptions for resume data changes

**Required Fix:**
```typescript
// Added refresh trigger and parent state props to ResumeViewer
interface ResumeViewerProps {
  refreshTrigger?: number;
  parentResumeState?: { useInPersonalization: boolean; filename?: string; } | null;
  onResumeDeleted?: () => void;
}

// Added real-time database subscriptions
const resumeChannel = supabaseClient
  .channel('user_profiles_changes')
  .on('postgres_changes', { event: 'UPDATE', table: 'user_profiles' }, (payload) => {
    loadResumeData();
    setResumeRefreshTrigger(prev => prev + 1);
  });

// Added useEffect hooks for synchronization
useEffect(() => {
  loadUserProfile();
}, [refreshTrigger]);

useEffect(() => {
  if (parentResumeState && resumeData) {
    setResumeData(prev => prev ? {
      ...prev,
      useInPersonalization: parentResumeState.useInPersonalization
    } : null);
  }
}, [parentResumeState]);
```

**Files Modified:**
- `components/ui/resume-viewer.tsx` (added sync props and effects)
- `components/ui/dashboard.tsx` (passed sync props)
- `app/dashboard/page.tsx` (added real-time subscriptions)

**Testing:**
- [ ] Upload resume from search panel → Verify instant sync to dashboard
- [ ] Delete resume from dashboard → Verify instant sync to search panel
- [ ] Toggle resume usage → Verify sync across components
- [ ] Replace resume → Verify all components update
- [ ] Test real-time updates with multiple browser tabs

---

### **Issue #8: Resume Upload Functionality Enhancement**
**Status:** ✅ FIXED  
**Priority:** HIGH  
**Impact:** Resume upload reliability and user experience

**Problem:**
- Resume upload functionality had poor error handling
- Text extraction API only supported PDF files
- Generic error messages didn't help users understand issues
- No fallback handling for text extraction failures

**Root Cause:**
- API route only handled PDF files, not Word documents
- Insufficient error handling in upload component
- Missing specific error messages for different failure scenarios

**Required Fix:**
```typescript
// Enhanced API route with support for both PDF and DOCX
if (file.type === 'application/pdf') {
  const pdf = require('pdf-parse');
  const data = await pdf(dataBuffer);
  extractedText = data.text;
} else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
           file.type === 'application/msword') {
  const mammoth = require('mammoth');
  const result = await mammoth.extractRawText({ buffer: dataBuffer });
  extractedText = result.value;
}

// Enhanced error handling in upload component
if (uploadError.message.includes('not found')) {
  throw new Error('Storage bucket not found. Please contact support.');
} else if (uploadError.message.includes('permission')) {
  throw new Error('Permission denied. Please check your account status.');
} else if (uploadError.message.includes('size')) {
  throw new Error('File too large. Please choose a smaller file.');
}
```

**Files Modified:**
- `app/api/extract-text/route.ts` (enhanced file type support)
- `components/ui/resume-upload.tsx` (improved error handling)

**Testing:**
- [ ] Upload PDF file → Verify text extraction works
- [ ] Upload DOCX file → Verify text extraction works
- [ ] Upload large file → Verify appropriate error message
- [ ] Test with invalid file type → Verify clear error message
- [ ] Test with network issues → Verify graceful error handling

---

### **Issue #5: Email Container Styling Bug**
**Status:** 🔴 OPEN  
**Priority:** MEDIUM  
**Impact:** Inconsistent UI, poor visual hierarchy

**Problem:**
- Email container has no gap between output and buttons
- LinkedIn container has proper spacing
- Inconsistent styling between containers

**Required Fix:**
```typescript
// In dashboard-client.tsx, update Email CardContent:
<CardContent className="space-y-4"> {/* Add space-y-4 class */}
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <Label className="text-sm font-medium">Cold Email</Label>
      <ToneSelector
        selectedTone={emailTone}
        onToneChange={setEmailTone}
        className="w-32"
      />
    </div>
    <Textarea
      value={editableEmail}
      onChange={(e) => setEditableEmail(e.target.value)}
      className="min-h-[200px]"
      placeholder="Your personalized cold email will appear here..."
    />
  </div>
  
  {/* Buttons section with proper spacing */}
  <div className="flex gap-2">
    <Button
      onClick={regenerateEmail}
      disabled={regeneratingEmail}
      variant="outline"
      size="sm"
    >
      {regeneratingEmail ? (
        <RefreshCw className="h-4 w-4 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4" />
      )}
      Regenerate
    </Button>
    {/* ... other buttons */}
  </div>
</CardContent>
```

**Files to Modify:**
- `app/dashboard/dashboard-client.tsx` (Email CardContent section)

**Testing:**
- [ ] Verify email container has same spacing as LinkedIn container
- [ ] Test responsive design on mobile
- [ ] Verify button alignment and spacing

---

### **Issue #6: Company Search Fallback Enhancement**
**Status:** 🔴 OPEN  
**Priority:** MEDIUM  
**Impact:** Better user guidance, improved success rate

**Problem:**
- When company not found, users don't know what to do
- No guidance on alternative search methods
- Poor user experience for failed searches

**Required Fix:**
```typescript
// In dashboard-client.tsx, add enhanced fallback UI:
{!hasValidCompany && company && (
  <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
    <div className="flex items-start gap-2">
      <Search className="h-4 w-4 text-amber-600 mt-0.5" />
      <div className="text-sm">
        <p className="text-amber-800 font-medium">
          Company not found in our database
        </p>
        <p className="text-amber-700 mt-1">
          Try searching with the full website URL for better results:
        </p>
        <div className="mt-2 space-y-1">
          <p className="text-xs text-amber-600">
            Examples: google.com, microsoft.com, apple.com
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowUrlFallback(true)}
            className="text-xs"
          >
            Enter Website URL
          </Button>
        </div>
      </div>
    </div>
  </div>
)}
```

**Files to Modify:**
- `app/dashboard/dashboard-client.tsx` (company search section)

**Testing:**
- [ ] Search for non-existent company → Verify enhanced guidance appears
- [ ] Click "Enter Website URL" → Verify fallback form appears
- [ ] Test with valid company → Verify guidance disappears

---

### **Issue #7: Key Highlights Optional Enhancement**
**Status:** 🔴 OPEN  
**Priority:** MEDIUM  
**Impact:** Better user experience, clearer guidance

**Problem:**
- Key highlights field is required but users don't understand its importance
- No guidance on how to use highlights effectively
- Missing visual indication of optionality

**Required Fix:**
```typescript
// In dashboard-client.tsx, update highlights section:
<div className="space-y-2">
  <div className="flex items-center gap-2">
    <Label htmlFor="highlights" className="text-sm font-medium">
      Key Highlights (Optional)
    </Label>
    <Badge variant="secondary" className="text-xs">
      Pro Tip
    </Badge>
  </div>
  <Textarea
    id="highlights"
    value={highlights}
    onChange={(e) => setHighlights(e.target.value)}
    placeholder="Add specific achievements, skills, or experiences that make you stand out for this role..."
    className="min-h-[80px]"
  />
  <p className="text-xs text-muted-foreground">
    💡 Adding highlights makes your outreach more personal and increases response rates
  </p>
</div>
```

**Files to Modify:**
- `app/dashboard/dashboard-client.tsx` (highlights input section)

**Testing:**
- [ ] Verify "Optional" label appears
- [ ] Verify "Pro Tip" badge appears
- [ ] Verify helpful placeholder text
- [ ] Test with and without highlights

---

## 🔧 IMPLEMENTATION CHECKLIST

### **Before Starting:**
- [ ] Read the issue description carefully
- [ ] Identify the root cause (not just symptoms)
- [ ] Plan the minimal changes needed
- [ ] Check for existing similar code patterns

### **During Implementation:**
- [ ] Make only necessary changes
- [ ] Follow existing code patterns and naming conventions
- [ ] Add proper error handling
- [ ] Test the fix thoroughly

### **After Implementation:**
- [ ] Test the fix in isolation
- [ ] Test the fix in context of full application
- [ ] Verify no regressions introduced
- [ ] Update this file to mark issue as fixed

### **Testing Requirements:**
- [ ] Unit tests for new functions
- [ ] Integration tests for API changes
- [ ] Manual testing of user workflows
- [ ] Cross-browser compatibility testing

---

## 📊 SUCCESS METRICS

### **Issue Resolution:**
- ✅ All critical bugs fixed
- ✅ No regressions introduced
- ✅ User experience improved
- ✅ Code quality maintained

### **Code Quality:**
- ✅ Minimal file changes
- ✅ Consistent with existing patterns
- ✅ Proper error handling
- ✅ TypeScript compliance

---

**This file serves as the definitive bug tracking system. Fix issues systematically and update status as completed.**



