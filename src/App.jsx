import { useState, useEffect, useRef } from 'react';
import { BookOpen, Wrench, Atom, FileText, Plus, Upload, Loader2, ArrowRight, ArrowLeft, Calculator, FlaskConical, Globe, Code, Palette, Briefcase, Music, Image as ImageIcon, X, Download, Search, Edit, Save, Trash2, Calendar, Copy, Scissors, FileDown, LogOut, Lock, Mail, Pencil, BrainCircuit, CheckCircle, XCircle, Image as ImageUpload } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { supabase } from './supabase';

const availableIcons = {
  BookOpen: <BookOpen className="w-6 h-6" />, Atom: <Atom className="w-6 h-6" />, Wrench: <Wrench className="w-6 h-6" />, FileText: <FileText className="w-6 h-6" />, Calculator: <Calculator className="w-6 h-6" />, FlaskConical: <FlaskConical className="w-6 h-6" />, Globe: <Globe className="w-6 h-6" />, Code: <Code className="w-6 h-6" />, Palette: <Palette className="w-6 h-6" />, Briefcase: <Briefcase className="w-6 h-6" />, Music: <Music className="w-6 h-6" />, ImageIcon: <ImageIcon className="w-6 h-6" />
};

function App() {
  const [session, setSession] = useState(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [currentView, setCurrentView] = useState('dashboard');
  const [activeNote, setActiveNote] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [viewMode, setViewMode] = useState('preview'); 
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem('ostad_categories');
    return saved ? JSON.parse(saved) : [
      { id: 'math', label: 'ریاضی', iconKey: 'Calculator' },
      { id: 'physics', label: 'فیزیک', iconKey: 'Atom' },
      { id: 'engineering', label: 'مهندسی', iconKey: 'Wrench' },
      { id: 'general', label: 'عمومی', iconKey: 'BookOpen' },
    ];
  });

  const [notes, setNotes] = useState([]);

  // 🌟 استیت‌های سیستم آزمون و آموزش
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [quizPhase, setQuizPhase] = useState('select'); // 'select' | 'generating' | 'summary' | 'conceptual' | 'problem'
  const [selectedNotesForQuiz, setSelectedNotesForQuiz] = useState([]);
  const [quizData, setQuizData] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  
  // برای تصحیح عکس مسئله
  const [solutionImage, setSolutionImage] = useState(null);
  const [isGrading, setIsGrading] = useState(false);
  const [gradingFeedback, setGradingFeedback] = useState(null);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('BookOpen');
  const [editingCatId, setEditingCatId] = useState(null);

  const [selectedFiles, setSelectedFiles] = useState([]); 
  const [imagePreviews, setImagePreviews] = useState([]);
  
  const [extractedText, setExtractedText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteCategory, setNoteCategory] = useState(categories[0]?.id || 'general');
  const [errorMsg, setErrorMsg] = useState('');
  const pdfRef = useRef();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setSession(session); });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { localStorage.setItem('ostad_categories', JSON.stringify(categories)); }, [categories]);

  const fetchNotes = async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      const response = await fetch('/getNotes', { headers: { 'Authorization': `Bearer ${session.access_token}` } });
      if (response.ok) { const data = await response.json(); setNotes(data || []); }
    } catch (error) { console.error('Network error:', error); } finally { setIsLoading(false); }
  };

  useEffect(() => { if (session) fetchNotes(); }, [session]);

  const handleAuth = async (e) => {
    e.preventDefault(); setAuthLoading(true); setAuthError('');
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email: authEmail.trim(), password: authPassword });
        if (error) throw error; alert('ثبت‌نام موفق!'); setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword });
        if (error) throw error;
      }
    } catch (error) { setAuthError(error.message); } finally { setAuthLoading(false); }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard'); setViewMode('preview'); setActiveNote(null); setSelectedFiles([]); setImagePreviews([]); setExtractedText(''); setNoteTitle(''); setErrorMsg('');
  };

  // 🌟 توابع آزمون
  const openQuizModal = () => {
    const currentNotes = activeCategory === 'all' ? notes : notes.filter(n => n.category_id === activeCategory);
    setSelectedNotesForQuiz(currentNotes.map(n => n.id));
    setQuizPhase('select');
    setQuizData(null);
    setIsQuizModalOpen(true);
  };

  const toggleNoteSelection = (id) => {
    setSelectedNotesForQuiz(prev => prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]);
  };

  const generateQuiz = async () => {
    if (selectedNotesForQuiz.length === 0) { alert("حداقل یک جزوه را انتخاب کنید."); return; }
    setQuizPhase('generating');
    
    const notesToRead = notes.filter(n => selectedNotesForQuiz.includes(n.id));
    const combinedText = notesToRead.map(n => `عنوان: ${n.title}\n${n.text}`).join('\n\n---\n\n');
    const subject = activeCategory === 'all' ? 'همه دروس' : categories.find(c => c.id === activeCategory)?.label;

    try {
      const response = await fetch('/generateQuiz', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notesText: combinedText, subject })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setQuizData(data);
      setQuizPhase('summary');
    } catch (error) {
      alert("خطا در ساخت آزمون: " + error.message);
      setQuizPhase('select');
    }
  };

  const handleOptionSelect = (index) => {
    if (showFeedback) return;
    setSelectedOption(index);
    setShowFeedback(true);
  };

  const nextQuestion = () => {
    setSelectedOption(null); setShowFeedback(false); setSolutionImage(null); setGradingFeedback(null);
    
    const currentList = quizPhase === 'conceptual' ? quizData.conceptual_questions : quizData.problem_questions;
    
    if (currentQuestionIndex < currentList.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      if (quizPhase === 'conceptual') {
        // رفتن به مرحله مسائل
        setQuizPhase('problem');
        setCurrentQuestionIndex(0);
      } else {
        // پایان آزمون
        setIsQuizModalOpen(false);
        alert("تبریک! آزمون به پایان رسید.");
      }
    }
  };

  const handleGradeImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSolutionImage(URL.createObjectURL(file));
    setIsGrading(true);
    setGradingFeedback(null);

    try {
      const base64Data = await fileToBase64(file);
      const currentQ = quizData.problem_questions[currentQuestionIndex];
      
      const response = await fetch('/gradeSolution', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data.imageBase64,
          mimeType: 'image/jpeg',
          problemText: currentQ.question,
          correctSolution: currentQ.solution_steps
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setGradingFeedback(data.feedback);
    } catch (err) {
      setGradingFeedback("خطا در تصحیح عکس: " + err.message);
    } finally {
      setIsGrading(false);
    }
  };

  // ... (بقیه توابع مثل handleImageChange, handleExtract, handleSaveNote, handleDeleteNote, openNote, handleDownloadPDF بدون تغییر می‌مونن)
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const limitedFiles = files.slice(0, 5); 
      setSelectedFiles(limitedFiles);
      const previews = limitedFiles.map(file => URL.createObjectURL(file));
      setImagePreviews(previews); setExtractedText(''); setErrorMsg('');
    }
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image(); img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200; const scaleSize = MAX_WIDTH / img.width;
          if (img.width <= MAX_WIDTH) { canvas.width = img.width; canvas.height = img.height; } 
          else { canvas.width = MAX_WIDTH; canvas.height = img.height * scaleSize; }
          const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
          resolve({ imageBase64: base64, mimeType: 'image/jpeg' });
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleExtract = async (e) => {
    e.preventDefault(); if (selectedFiles.length === 0) return;
    setIsExtracting(true); setErrorMsg('');
    const controller = new AbortController(); const timeoutId = setTimeout(() => controller.abort(), 90000);
    try {
      const processedImages = await Promise.all(selectedFiles.map(file => fileToBase64(file)));
      const response = await fetch('/extract', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: processedImages }), signal: controller.signal
      });
      clearTimeout(timeoutId); const responseText = await response.text();
      let data; try { data = JSON.parse(responseText); } catch (parseError) { throw new Error("پاسخ سرور نامعتبر بود."); }
      if (!response.ok) throw new Error(data.error || 'خطا');
      setExtractedText(data.text);
    } catch (error) {
      if (error.name === 'AbortError') { setErrorMsg("زمان پردازش به پایان رسید."); } else { setErrorMsg("خطا در استخراج: " + error.message); }
    } finally { setIsExtracting(false); }
  };

  const handleCopyText = () => { navigator.clipboard.writeText(extractedText); setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); };

  const handleSaveNote = async (isNew = true) => {
    if (!extractedText.trim() || !session) return;
    try {
      const payload = isNew ? { action: 'insert', title: noteTitle || 'یادداشت', text: extractedText, image_url: imagePreviews[0] || null, category_id: noteCategory, user_id: session.user.id } 
                           : { action: 'update', id: activeNote.id, title: noteTitle, text: extractedText };
      const response = await fetch('/manageNote', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` }, body: JSON.stringify(payload)
      });
      const data = await response.json(); if (!response.ok) { alert("خطا: " + (data.error || 'سرور')); return; }
      await fetchNotes(); handleBackToDashboard();
    } catch (err) { alert("خطای شبکه: " + err.message); }
  };

  const handleDeleteNote = async (id, e) => {
    e.stopPropagation(); if (!window.confirm('حذف شود؟')) return;
    try {
      const response = await fetch('/manageNote', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` }, body: JSON.stringify({ action: 'delete', id })
      });
      if (!response.ok) throw new Error("خطا در حذف"); await fetchNotes();
    } catch (err) { alert(err.message); }
  };

  const openNote = (note) => { setActiveNote(note); setNoteTitle(note.title); setExtractedText(note.text); setNoteCategory(note.category_id); setViewMode('preview'); setCurrentView('detail'); };
  const handleDownloadPDF = () => { if (viewMode === 'edit') { alert("ابتدا از حالت ویرایش خارج شوید."); return; } window.print(); };
  const formatDate = (dateString) => { if (!dateString) return ''; return new Date(dateString).toLocaleDateString('fa-IR'); };

  const filteredNotes = activeCategory === 'all' ? notes : notes.filter(n => n.category_id === activeCategory);

  if (!session) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4 font-sans" dir="rtl">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-gray-100">
          <div className="text-center mb-8"><div className="w-16 h-16 bg-[#1E3A8A] text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"><BookOpen className="w-8 h-8" /></div><h1 className="text-2xl font-bold text-[#1E3A8A]">Ostad<span className="text-blue-500">AI</span></h1></div>
          <h2 className="text-xl font-bold text-center mb-6">{isSignUp ? 'ایجاد حساب جدید' : 'ورود به حساب'}</h2>
          {authError && <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm text-center border border-red-100">{authError}</div>}
          <form onSubmit={handleAuth} className="space-y-4">
            <div><label className="block text-sm font-bold text-gray-700 mb-2">ایمیل</label><div className="relative"><Mail className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" /><input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-10 outline-none focus:ring-2 focus:ring-[#1E3A8A]" required /></div></div>
            <div><label className="block text-sm font-bold text-gray-700 mb-2">رمز عبور</label><div className="relative"><Lock className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" /><input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-10 outline-none focus:ring-2 focus:ring-[#1E3A8A]" required /></div></div>
            <button type="submit" disabled={authLoading} className="w-full bg-[#1E3A8A] text-white py-3.5 rounded-xl font-bold hover:bg-blue-800 transition shadow-md flex justify-center items-center gap-2 disabled:bg-gray-400">{authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null} {isSignUp ? 'ثبت‌نام' : 'ورود'}</button>
          </form>
          <div className="mt-6 text-center"><button onClick={() => { setIsSignUp(!isSignUp); setAuthError(''); }} className="text-sm text-blue-600 hover:underline">{isSignUp ? 'وارد شوید' : 'ثبت‌نام کنید'}</button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans text-gray-800" dir="rtl">
      
      {/* 🌟 مودال آزمون و آموزش */}
      {isQuizModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b bg-[#1E3A8A] text-white">
              <div className="flex items-center gap-2"><BrainCircuit className="w-6 h-6" /><h3 className="font-bold text-xl">سیستم آموزش هوشمند</h3></div>
              <button onClick={() => setIsQuizModalOpen(false)} className="text-white/80 hover:text-white"><X className="w-6 h-6"/></button>
            </div>
            
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
              {/* فاز ۱: انتخاب جزوات */}
              {quizPhase === 'select' && (
                <div>
                  <h4 className="font-bold text-lg mb-4">کدام جزوات را می‌خواهی بخوانی؟</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                    {notes.filter(n => activeCategory === 'all' || n.category_id === activeCategory).map(note => (
                      <label key={note.id} className="flex items-center gap-3 p-4 border rounded-xl cursor-pointer hover:bg-blue-50 transition">
                        <input type="checkbox" checked={selectedNotesForQuiz.includes(note.id)} onChange={() => toggleNoteSelection(note.id)} className="w-5 h-5 accent-blue-600" />
                        <span className="font-medium">{note.title}</span>
                      </label>
                    ))}
                  </div>
                  <button onClick={generateQuiz} className="w-full bg-[#1E3A8A] text-white py-3 rounded-xl font-bold hover:bg-blue-800">شروع تحلیل و ساخت آزمون</button>
                </div>
              )}

              {/* فاز ۲: در حال تولید */}
              {quizPhase === 'generating' && (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                  <p className="text-gray-600 font-medium">استاد ای‌آی در حال مطالعه جزوات و طراحی سوالات است...</p>
                </div>
              )}

              {/* فاز ۳: خلاصه */}
              {quizPhase === 'summary' && quizData && (
                <div>
                  <div className="prose prose-lg max-w-none text-justify mb-8 [&_.katex-display]:!text-left [&_.katex-display]:!dir-ltr">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{quizData.summary}</ReactMarkdown>
                  </div>
                  <button onClick={() => { setQuizPhase('conceptual'); setCurrentQuestionIndex(0); }} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700">شروع تست‌های مفهومی</button>
                </div>
              )}

              {/* فاز ۴: سوالات مفهومی */}
              {quizPhase === 'conceptual' && quizData && (
                <div>
                  <div className="flex justify-between items-center mb-6 text-sm font-bold text-gray-500">
                    <span>سوال مفهومی {currentQuestionIndex + 1} از {quizData.conceptual_questions.length}</span>
                  </div>
                  <div className="text-xl font-bold mb-6 prose max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{quizData.conceptual_questions[currentQuestionIndex].question}</ReactMarkdown>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                    {quizData.conceptual_questions[currentQuestionIndex].options.map((opt, idx) => {
                      const isCorrect = idx === quizData.conceptual_questions[currentQuestionIndex].correct_index;
                      let btnClass = "w-full text-right p-4 rounded-xl border-2 transition font-medium ";
                      if (!showFeedback) btnClass += "border-gray-200 hover:border-blue-400 hover:bg-blue-50";
                      else if (isCorrect) btnClass += "border-green-500 bg-green-50 text-green-700";
                      else if (selectedOption === idx) btnClass += "border-red-500 bg-red-50 text-red-700";
                      else btnClass += "border-gray-200 opacity-50";

                      return (
                        <button key={idx} onClick={() => handleOptionSelect(idx)} disabled={showFeedback} className={btnClass}>
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {showFeedback && (
                    <div className={`p-4 rounded-xl mb-6 ${selectedOption === quizData.conceptual_questions[currentQuestionIndex].correct_index ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                      <div className="flex items-center gap-2 mb-2 font-bold">
                        {selectedOption === quizData.conceptual_questions[currentQuestionIndex].correct_index ? <><CheckCircle className="w-5 h-5"/> پاسخ درست!</> : <><XCircle className="w-5 h-5"/> پاسخ اشتباه بود.</>}
                      </div>
                      <p className="text-sm">{quizData.conceptual_questions[currentQuestionIndex].explanation}</p>
                    </div>
                  )}

                  {showFeedback && (
                    <button onClick={nextQuestion} className="w-full bg-[#1E3A8A] text-white py-3 rounded-xl font-bold hover:bg-blue-800">سوال بعدی</button>
                  )}
                </div>
              )}

              {/* فاز ۵: مسائل */}
              {quizPhase === 'problem' && quizData && (
                <div>
                  <div className="flex justify-between items-center mb-6 text-sm font-bold text-gray-500">
                    <span>مسئله {currentQuestionIndex + 1} از {quizData.problem_questions.length}</span>
                  </div>
                  <div className="text-xl font-bold mb-6 prose max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{quizData.problem_questions[currentQuestionIndex].question}</ReactMarkdown>
                  </div>

                  {/* آپلود عکس حل مسئله */}
                  {!showFeedback && (
                    <div className="mb-6 p-4 border-2 border-dashed border-blue-300 rounded-xl bg-blue-50 text-center">
                      <p className="text-sm font-bold text-blue-800 mb-2">می‌خواهی استاد ای‌آی راه حل دست‌نویس تو را تصحیح کند؟</p>
                      <label className="cursor-pointer bg-white border border-blue-200 text-blue-700 px-4 py-2 rounded-lg font-bold hover:bg-blue-100 inline-flex items-center gap-2">
                        <ImageUpload className="w-4 h-4" /> آپلود عکس راه حل
                        <input type="file" accept="image/*" onChange={handleGradeImage} className="hidden" />
                      </label>
                      
                      {isGrading && <p className="mt-4 text-blue-600 font-medium animate-pulse">در حال بررسی راه حل شما...</p>}
                      {gradingFeedback && (
                        <div className="mt-4 p-4 bg-white rounded-lg text-right text-sm text-gray-700 border border-blue-100 prose max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{gradingFeedback}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-3 mb-6">
                    {quizData.problem_questions[currentQuestionIndex].options.map((opt, idx) => {
                      const isCorrect = idx === quizData.problem_questions[currentQuestionIndex].correct_index;
                      let btnClass = "w-full text-right p-4 rounded-xl border-2 transition font-medium ";
                      if (!showFeedback) btnClass += "border-gray-200 hover:border-blue-400 hover:bg-blue-50";
                      else if (isCorrect) btnClass += "border-green-500 bg-green-50 text-green-700";
                      else if (selectedOption === idx) btnClass += "border-red-500 bg-red-50 text-red-700";
                      else btnClass += "border-gray-200 opacity-50";

                      return (
                        <button key={idx} onClick={() => handleOptionSelect(idx)} disabled={showFeedback} className={btnClass}>
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {showFeedback && (
                    <div className={`p-4 rounded-xl mb-6 ${selectedOption === quizData.problem_questions[currentQuestionIndex].correct_index ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                      <div className="flex items-center gap-2 mb-2 font-bold">
                        {selectedOption === quizData.problem_questions[currentQuestionIndex].correct_index ? <><CheckCircle className="w-5 h-5"/> گزینه نهایی درست است!</> : <><XCircle className="w-5 h-5"/> گزینه نهایی اشتباه است.</>}
                      </div>
                      <p className="text-sm">{quizData.problem_questions[currentQuestionIndex].explanation}</p>
                    </div>
                  )}

                  {showFeedback && (
                    <button onClick={nextQuestion} className="w-full bg-[#1E3A8A] text-white py-3 rounded-xl font-bold hover:bg-blue-800">مسئله بعدی</button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ... (مودال‌های دسته بندی مثل قبل) */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md">
            <div className="flex justify-between p-6 border-b"><h3 className="font-bold text-xl">{editingCatId ? 'ویرایش دسته' : 'دسته جدید'}</h3><button onClick={() => setIsCategoryModalOpen(false)}><X className="w-6 h-6"/></button></div>
            <div className="p-6"><input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="نام دسته..." className="w-full border rounded-xl px-4 py-3 mb-6 outline-none" /><div className="grid grid-cols-4 gap-3">{Object.keys(availableIcons).map((key) => (<button key={key} onClick={() => setNewCatIcon(key)} className={`p-3 rounded-xl border-2 flex justify-center ${newCatIcon === key ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-gray-100 text-gray-400'}`}>{availableIcons[key]}</button>))}</div></div>
            <div className="p-6 bg-gray-50 text-left"><button onClick={() => { if(!newCatName.trim()) return; if (editingCatId) { setCategories(categories.map(c => c.id === editingCatId ? { ...c, label: newCatName, iconKey: newCatIcon } : c)); } else { setCategories([...categories, {id: Date.now().toString(), label: newCatName, iconKey: newCatIcon}]); } setIsCategoryModalOpen(false); setNewCatName(''); }} className="bg-[#1E3A8A] text-white px-6 py-2 rounded-xl font-bold">ذخیره</button></div>
          </div>
        </div>
      )}

      <header className="bg-white shadow-sm border-b py-3 px-6 flex justify-between items-center sticky top-0 z-50 print:hidden">
        <div className="flex items-center gap-3 cursor-pointer" onClick={handleBackToDashboard}>
          <div className="w-10 h-10 bg-[#1E3A8A] text-white rounded-xl flex items-center justify-center shadow-md"><BookOpen className="w-6 h-6" /></div>
          <div><h1 className="text-xl font-bold text-[#1E3A8A]">Ostad<span className="text-blue-500">AI</span></h1><p className="text-xs text-gray-500">دستیار هوشمند جزوه‌های دانشگاهی</p></div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => { handleBackToDashboard(); setCurrentView('upload'); }} className="bg-[#1E3A8A] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-800 transition shadow-md"><Plus className="w-5 h-5" /> یادداشت جدید</button>
          <button onClick={handleLogout} className="text-gray-500 hover:text-red-500 flex items-center gap-1 text-sm font-medium transition"><LogOut className="w-4 h-4" /> خروج</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto mt-8 px-4 pb-20">
        {currentView === 'dashboard' && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div onClick={() => setActiveCategory('all')} className={`group relative flex flex-col items-center justify-center p-6 rounded-3xl cursor-pointer transition-all ${activeCategory === 'all' ? 'bg-[#1E3A8A] text-white shadow-lg' : 'bg-white text-gray-600 border border-gray-100 hover:shadow-md'}`}><div className={`${activeCategory === 'all' ? 'text-white' : 'text-[#1E3A8A]'} mb-3`}><FileText className="w-6 h-6" /></div><span className="font-bold">همه</span></div>
              {categories.map((cat) => (
                <div key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`group relative flex flex-col items-center justify-center p-6 rounded-3xl cursor-pointer transition-all ${activeCategory === cat.id ? 'bg-[#1E3A8A] text-white shadow-lg' : 'bg-white text-gray-600 border border-gray-100 hover:shadow-md'}`}>
                  <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e) => { e.stopPropagation(); setEditingCatId(cat.id); setNewCatName(cat.label); setNewCatIcon(cat.iconKey); setIsCategoryModalOpen(true); }} className="bg-white/80 p-1.5 rounded-lg text-blue-600 hover:bg-blue-100 shadow-sm"><Pencil className="w-3.5 h-3.5" /></button><button onClick={(e) => { e.stopPropagation(); if(window.confirm('حذف شود؟')) setCategories(categories.filter(c=>c.id!==cat.id)); }} className="bg-white/80 p-1.5 rounded-lg text-red-500 hover:bg-red-50 shadow-sm"><Trash2 className="w-3.5 h-3.5" /></button></div>
                  <div className={`${activeCategory === cat.id ? 'text-white' : 'text-[#1E3A8A]'} mb-3`}>{availableIcons[cat.iconKey]}</div><span className="font-bold">{cat.label}</span>
                </div>
              ))}
              <div onClick={() => { setEditingCatId(null); setNewCatName(''); setNewCatIcon('BookOpen'); setIsCategoryModalOpen(true); }} className="flex flex-col items-center justify-center p-6 rounded-3xl border-2 border-dashed border-gray-300 text-gray-400 hover:border-blue-500 hover:text-blue-500 cursor-pointer transition-all bg-white"><Plus className="w-6 h-6 mb-3" /><span className="font-bold">دسته جدید</span></div>
            </div>

            <div className="flex justify-between items-center mb-6 bg-blue-50 border border-blue-100 p-4 rounded-2xl">
              <div><h3 className="font-bold text-[#1E3A8A]">آماده‌ی امتحان هستی؟</h3><p className="text-sm text-gray-600 mt-1">هوش مصنوعی از جزوات انتخابی، خلاصه و آزمون تعاملی می‌سازد.</p></div>
              <button onClick={openQuizModal} className="bg-[#1E3A8A] text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-800 transition shadow-md shrink-0"><BrainCircuit className="w-5 h-5" /> برنامه‌ریزی امتحان</button>
            </div>

            <div className="flex justify-between items-end mb-6"><h2 className="text-2xl font-bold">یادداشت‌های من</h2><span className="text-sm text-gray-500">{filteredNotes.length} مورد</span></div>

            {isLoading ? ( <div className="flex justify-center items-center py-20"><Loader2 className="w-10 h-10 text-blue-600 animate-spin" /></div> ) : filteredNotes.length === 0 ? ( <div className="bg-white rounded-3xl border border-gray-100 p-16 flex flex-col items-center text-center shadow-sm"><FileText className="w-12 h-12 text-gray-300 mb-4" /><p className="text-gray-500 font-medium">یادداشتی نیست.</p></div> ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredNotes.map((note) => (
                  <div key={note.id} className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition flex flex-col">
                    <h3 className="font-bold text-xl text-gray-800 mb-4">{note.title}</h3>
                    <div className="flex gap-2 mb-6"><span className="flex items-center gap-1 bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium"><Calendar className="w-3.5 h-3.5" /> {formatDate(note.created_at)}</span><span className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-medium">{categories.find(c => c.id === note.category_id)?.label || 'عمومی'}</span></div>
                    <div className="border-t pt-4 flex justify-between items-center"><button onClick={() => openNote(note)} className="text-[#1E3A8A] font-bold flex items-center gap-2 hover:underline"><ArrowLeft className="w-4 h-4" /> باز کردن</button><button onClick={(e) => handleDeleteNote(note.id, e)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5" /></button></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ... (بخش‌های upload و detail بدون تغییر باقی می‌مونن، برای جلوگیری از طولانی شدن کد حذفشون کردم، اما توی فایل اصلی باید همون‌طور که بود باشن) */}
        {currentView === 'upload' && (
          <div className="max-w-3xl mx-auto">
            <button onClick={handleBackToDashboard} className="flex items-center gap-2 text-gray-500 hover:text-blue-600 mb-6 font-medium"><ArrowRight className="w-5 h-5" /> بازگشت</button>
            <div className="bg-white rounded-3xl shadow-sm border p-6 mb-6">
              <div className="grid grid-cols-2 gap-4 mb-6"><div><label className="block text-sm font-bold text-gray-700 mb-2">عنوان</label><input type="text" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} className="w-full border rounded-xl px-4 py-3 outline-none" /></div><div><label className="block text-sm font-bold text-gray-700 mb-2">دسته</label><select value={noteCategory} onChange={(e) => setNoteCategory(e.target.value)} className="w-full border rounded-xl px-4 py-3 bg-white">{categories.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}</select></div></div>
              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center relative bg-gray-50">
                {imagePreviews.length > 0 ? ( <div className="flex flex-col items-center"><div className="mb-4 bg-blue-100 text-blue-800 font-bold px-4 py-2 rounded-lg">{imagePreviews.length} عکس</div><div className="flex flex-wrap gap-2 justify-center mb-4">{imagePreviews.map((src, idx) => <img key={idx} src={src} className="h-32 object-contain rounded-lg border" />)}</div><div className="flex gap-4"><button onClick={handleExtract} disabled={isExtracting} className="bg-[#1E3A8A] text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 disabled:bg-gray-400">{isExtracting ? <Loader2 className="w-5 h-5 animate-spin" /> : null} استخراج متن</button><label className="cursor-pointer bg-white border text-gray-700 px-6 py-3 rounded-xl font-bold">تغییر عکس‌ها<input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" /></label></div></div>) : (<div className="relative py-10 cursor-pointer"><input type="file" accept="image/*" multiple onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0" /><Upload className="w-12 h-12 text-[#1E3A8A] mx-auto mb-3 opacity-50" /><p className="font-bold text-gray-700">عکس‌های جزوه را انتخاب کنید</p></div>)}
              </div>{errorMsg && <div className="bg-red-50 text-red-600 p-4 rounded-xl mt-4 text-center">{errorMsg}</div>}
            </div>
            {extractedText && (<div className="bg-white rounded-3xl shadow-sm border p-6 mb-6"><h3 className="font-bold text-lg mb-4">متن استخراج شده</h3><textarea value={extractedText} onChange={(e) => setExtractedText(e.target.value)} className="w-full h-64 p-4 bg-gray-50 border rounded-xl mb-4" /><button onClick={() => handleSaveNote(true)} className="w-full bg-green-600 text-white py-3.5 rounded-xl font-bold">ذخیره یادداشت</button></div>)}
          </div>
        )}

        {currentView === 'detail' && activeNote && (
          <div className="max-w-4xl mx-auto">
            <button onClick={handleBackToDashboard} className="flex items-center gap-2 text-gray-500 mb-6 font-medium print:hidden"><ArrowRight className="w-5 h-5" /> بازگشت</button>
            <div className="text-center mb-6 print:hidden">{viewMode === 'edit' ? (<input type="text" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} className="text-3xl font-black text-[#1E3A8A] text-center w-full border-b-2 border-dashed outline-none" />) : (<h1 className="text-3xl font-black text-[#1E3A8A]">{activeNote.title}</h1>)}</div>
            <div className="flex justify-between items-center mb-4 px-2 max-w-3xl mx-auto print:hidden"><h2 className="font-bold text-lg">پیش‌نمایش</h2><button onClick={handleCopyText} className="text-sm text-gray-500 flex items-center gap-1"><Copy className="w-4 h-4" /> {isCopied ? 'کپی شد!' : 'کپی'}</button></div>
            <div className="flex bg-gray-100 p-1 rounded-2xl mb-6 w-full max-w-xs mx-auto print:hidden"><button onClick={() => setViewMode('preview')} className={`flex-1 py-2 rounded-xl font-bold ${viewMode === 'preview' ? 'bg-white text-[#1E3A8A] shadow-sm' : 'text-gray-500'}`}>پیش‌نمایش</button><button onClick={() => setViewMode('edit')} className={`flex-1 py-2 rounded-xl font-bold ${viewMode === 'edit' ? 'bg-white text-[#1E3A8A] shadow-sm' : 'text-gray-500'}`}>ویرایش</button></div>
            <div className="bg-[#e5e7eb] p-4 md:p-8 rounded-3xl shadow-inner max-w-3xl mx-auto mb-6 print:bg-transparent print:p-0">
              {viewMode === 'edit' ? (<textarea value={extractedText} onChange={(e) => setExtractedText(e.target.value)} className="w-full h-[600px] p-6 border-none rounded-xl bg-white outline-none" />) : (
                <div ref={pdfRef} className="bg-white p-8 md:p-12 shadow-2xl min-h-[700px] border print-area print:shadow-none print:border-none print:p-4">
                  <div className="border-b-2 pb-4 mb-8 flex justify-between items-center"><div><h2 className="text-2xl font-black">{activeNote.title}</h2></div><div className="text-right"><span className="font-bold text-[#1E3A8A] text-xl">Ostad<span className="text-blue-500">AI</span></span></div></div>
                  <div className="prose prose-lg max-w-none text-justify [&_.katex-display]:!text-left [&_.katex-display]:!dir-ltr"><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{extractedText}</ReactMarkdown></div>
                </div>
              )}
            </div>
            <div className="flex gap-4 max-w-3xl mx-auto print:hidden"><button className="flex-1 bg-white text-gray-700 py-3 rounded-xl font-bold flex justify-center items-center gap-2 border"><FileDown className="w-5 h-5" /> Word</button><button onClick={handleDownloadPDF} className="flex-1 bg-[#1E3A8A] text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2"><Download className="w-5 h-5" /> PDF</button></div>
            {viewMode === 'edit' && (<button onClick={() => handleSaveNote(false)} className="w-full mt-4 max-w-3xl mx-auto block bg-green-600 text-white py-3 rounded-xl font-bold print:hidden">ذخیره تغییرات</button>)}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;