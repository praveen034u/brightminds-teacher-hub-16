# Testing OCR Feature - Quick Guide

## 🧪 How to Test the New OCR Feature

### Prerequisites
✅ Tesseract.js installed (completed)
✅ Dev server running on http://localhost:8081/

### Test Steps

#### 1. Navigate to Question Papers
1. Open browser: http://localhost:8081/
2. Login to your account
3. Click "Question Papers" on dashboard

#### 2. Create New Question Paper
1. Click "Create Question Paper" button
2. Enter a paper title (e.g., "Test OCR Paper")
3. Click the "Upload Files" tab

#### 3. Upload Test Image
1. Click "Choose Files"
2. Select an image file containing questions
   - **Best test**: Screenshot or photo of printed questions
   - **Format examples**:
     ```
     Q1. What is the capital of France?
     
     Q2. Solve: 2 + 2 = ?
     a) 3
     b) 4
     c) 5
     d) 6
     ```

#### 4. Extract Questions
1. Click "Extract Questions" button
2. Wait for OCR processing (5-10 seconds)
3. Watch console for progress logs

#### 5. Review Results
You should see:
- ✅ Green "Files Processed" box with extracted text
- ✅ Blue "Extracted Questions" box with parsed questions
- ✅ Question cards with type badges (MCQ/Subjective)
- ✅ Options displayed for multiple-choice questions

#### 6. Import Questions
Two options:
- **Option A**: Click "Import" on individual questions
- **Option B**: Click "Import All" to import everything

#### 7. Save Question Paper
1. Review imported questions in the questions list
2. Edit if needed (delete unwanted questions)
3. Click "Save Question Paper"
4. Success! Paper is saved to database

## 📸 Creating Test Images

### Quick Test Image (Using Paint/Editor)
1. Open any text editor or Paint
2. Type some questions:
   ```
   Q1. What is 2+2?
   a) 3
   b) 4
   c) 5
   d) 6

   Q2. Define photosynthesis.

   Q3. Name the capital of India.
   a) Mumbai
   b) Delhi
   c) Kolkata
   d) Chennai
   ```
3. Take a screenshot
4. Save as PNG/JPG
5. Upload this image

### Best Practices for Test Images
✅ High contrast (black text on white background)
✅ Clear, readable font (not handwritten)
✅ High resolution (at least 300 DPI)
✅ Straight, not skewed
✅ Well-lit, no shadows

## 🔍 What to Observe

### In Console
```
Processing image: test.png
OCR Progress: 0%
OCR Progress: 25%
OCR Progress: 50%
OCR Progress: 75%
OCR Progress: 100%
Extracted text from test.png: [text content]
```

### In UI
1. **Upload section**: File names listed
2. **Processing**: "Processing..." button state
3. **Success toast**: "Extracted X questions from images!"
4. **Text display**: Raw OCR output in green box
5. **Questions**: Structured cards with import buttons

### Expected Results
- **Multiple Choice Questions**: Detected as "MCQ" type
- **Short Answer Questions**: Detected as "Subjective" type
- **Options**: Automatically extracted (a, b, c, d)
- **Numbering**: Questions numbered Q1, Q2, etc.

## ⚠️ Troubleshooting

### Problem: No questions extracted
**Check:**
- Are questions formatted with Q1., Q2., or 1., 2.?
- Is text clear and readable in the image?
- Try manually creating from extracted text

### Problem: Wrong text extracted
**Fix:**
- Improve image quality
- Use higher resolution
- Ensure good lighting
- Avoid skewed images

### Problem: OCR is slow
**Normal behavior:**
- First run downloads Tesseract models (~2-3MB)
- Subsequent runs are faster
- Large images take longer

### Problem: No text at all
**Check:**
- Is the image actually uploaded?
- Check browser console for errors
- Verify file is an image (not PDF)
- Try a different image

## ✅ Success Criteria

Your OCR implementation is working if:
- ✅ Image uploads successfully
- ✅ "Extract Questions" processes the image
- ✅ Raw text appears in green box
- ✅ Questions are detected and shown in cards
- ✅ You can import questions individually or all at once
- ✅ Imported questions appear in questions list
- ✅ Question paper saves successfully

## 🎯 Next Steps After Testing

### If it works:
1. Test with real scanned question papers
2. Test with multiple images
3. Test different image qualities
4. Test different question formats

### If it doesn't work:
1. Check browser console for errors
2. Verify Tesseract.js is installed (`npm list tesseract.js`)
3. Check network tab for model downloads
4. Try with a simple, clear test image first

## 📝 Test Checklist

- [ ] Can upload image files
- [ ] Extract button works
- [ ] OCR processes the image
- [ ] Text is extracted and displayed
- [ ] Questions are parsed from text
- [ ] Question types detected correctly (MCQ/Subjective)
- [ ] Options extracted for MCQs
- [ ] Individual import works
- [ ] Import all works
- [ ] Questions appear in questions list
- [ ] Can save question paper
- [ ] Saved paper appears in question papers list

## 🚀 Ready to Test!

1. Open: http://localhost:8081/
2. Go to: Dashboard → Question Papers
3. Click: Create Question Paper
4. Upload: Test image with questions
5. Extract: Click "Extract Questions"
6. Import: Use import buttons
7. Save: Save your question paper

**Good luck! 🎉**
