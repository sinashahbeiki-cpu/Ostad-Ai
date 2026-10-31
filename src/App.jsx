import { useState, useEffect, useRef } from 'react';
import { BookOpen, Wrench, Atom, FileText, Plus, Upload, Loader2, ArrowRight, ArrowLeft, Calculator, FlaskConical, Globe, Code, Palette, Briefcase, Music, Image as ImageIcon, X, Download, Search, Edit, Save, Trash2, Calendar, Copy, Scissors, FileDown } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { supabase } from './supabase'; 

const availableIcons = {
  BookOpen: <BookOpen className="w-6 h-6" />, Atom: <Atom className="w-6 h-6" />, Wrench: <Wrench className="w-6 h-6" />, FileText: <FileText className="w-6 h-6" />, Calculator: <Calculator className="w-6 h-6" />, FlaskConical: <FlaskConical className="w-6 h-6" />, Globe: <Globe className="w-6 h-6" />, Code: <Code className="w-6 h-6" />, Palette: <Palette className="w-6 h-6" />, Briefcase: <Briefcase className="w-6 h-6" />, Music: <Music className="w-6 h-6" />, ImageIcon: <ImageIcon className="w-6 h-6" />
};

function App() {
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

  useEffect(() => {
    localStorage.setItem('ostad_categories', JSON.stringify(categories));
  }, [categories]);

  const fetchNotes = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
    } else {
      setNotes(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('BookOpen');
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteCategory, setNoteCategory] = useState(categories[0]?.id || 'general');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const pdfRef = useRef();

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setViewMode('preview');
    setActiveNote(null);
    setSelectedImage(null);
    setExtractedText('');
    setNoteTitle('');
    setErrorMsg('');
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(URL.createObjectURL(file));
      setSelectedFile(file);
      setExtractedText('');
      setErrorMsg('');
    }
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200; 
          const scaleSize = MAX_WIDTH / img.width;
          
          if (img.width <= MAX_WIDTH) {
            canvas.width = img.width;
            canvas.height = img.height;
          } else {
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
          }

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
          resolve(base64);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleExtract = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;
    
    setIsExtracting(true);
    setErrorMsg('');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const base64Data = await fileToBase64(selectedFile);
      
      const response = await fetch('/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType: 'image/jpeg'
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error("پاسخ سرور نامعتبر بود. لطفا کلید API و تنظیمات کلودفلر را بررسی کنید.");
      }

      if (!response.ok) {
        throw new Error(data.error || 'خطا در ارتباط با هوش مصنوعی');
      }

      setExtractedText(data.text);
    } catch (error) {
      console.error(error);
      if (error.name === 'AbortError') {
        setErrorMsg("زمان درخواست به پایان رسید (۲۰ ثانیه). سرورهای هوش مصنوعی شلوغ هستند.");
      } else {
        setErrorMsg("خطا در استخراج متن: " + error.message);
      }
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(extractedText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // 🌟 تغییر اصلی: ارسال درخواست ذخیره به Cloudflare (به جای اتصال مستقیم به دیتابیس)
  const handleSaveNote = async (isNew = true) => {
    if (!extractedText.trim()) return;
    
    if (isNew) {
      try {
        const response = await fetch('/saveNote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: noteTitle || 'یادداشت بدون عنوان',
            text: extractedText,
            image_url: selectedImage, 
            category_id: noteCategory
          })
        });

        const data = await response.json();

        if (!response.ok) {
          alert("خطا در ذخیره‌سازی: " + (data.error || 'مشکل در ارتباط با سرور'));
          return;
        }
      } catch (err) {
        alert("خطای شبکه در ذخیره‌سازی: " + err.message);
        return;
      }
    } else {
      // برای ویرایش فعلا همان روش قبلی را نگه می‌داریم
      const { error } = await supabase.from('notes').update({
        title: noteTitle,
        text: extractedText
      }).eq('id', activeNote.id);

      if (error) {
        alert("خطا در ویرایش: " + error.message);
        return;
      }
    }
    
    await fetchNotes();
    handleBackToDashboard();
  };

  const handleDeleteNote = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('آیا از حذف این یادداشت مطمئن هستید؟')) {
      const { error } = await supabase.from('notes').delete().eq('id', id);
      if (error) {
        alert("خطا در حذف: " + error.message);
      } else {
        await fetchNotes();
      }
    }
  };

  const openNote = (note) => {
    setActiveNote(note);
    setNoteTitle(note.title);
    setExtractedText(note.text);
    setSelectedImage(note.image_url);
    setNoteCategory(note.category_id);
    setViewMode('preview');
    setCurrentView('detail');
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    setTimeout(async () => {
      try {
        const element = pdfRef.current;
        const opt = {
          margin: 0.5,
          filename: `${activeNote?.title || 'Ostad-AI'}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        };
        await html2pdf().set(opt).from(element).save();
      } catch (error) {
        console.error(error);
      } finally {
        setIsGeneratingPdf(false);
      }
    }, 500);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('fa-IR');
  };

  const filteredNotes = activeCategory === 'all' ? notes : notes.filter(n => n.category_id === activeCategory);

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans text-gray-800" dir="rtl">
      
      {/* مودال دسته بندی */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md">
            <div className="flex justify-between p-6 border-b"><h3 className="font-bold text-xl">دسته جدید</h3><button onClick={() => setIsCategoryModalOpen(false)}><X className="w-6 h-6"/></button></div>
            <div className="p-6">
              <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="نام..." className="w-full border rounded-xl px-4 py-3 mb-6 outline-none" />
              <div className="grid grid-cols-4 gap-3">
                {Object.keys(availableIcons).map((key) => (
                  <button key={key} onClick={() => setNewCatIcon(key)} className={`p-3 rounded-xl border-2 ${newCatIcon === key ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-gray-100 text-gray-400'}`}>{availableIcons[key]}</button>
                ))}
              </div>
            </div>
            <div className="p-6 bg-gray-50 text-left"><button onClick={() => { setCategories([...categories, {id: Date.now().toString(), label: newCatName, iconKey: newCatIcon}]); setIsCategoryModalOpen(false); setNewCatName(''); }} className="bg-[#1E3A8A] text-white px-6 py-2 rounded-xl font-bold">ذخیره</button></div>
          </div>
        </div>
      )}

      {/* هدر */}
      <header className="bg-white shadow-sm border-b py-3 px-6 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={handleBackToDashboard}>
          <div className="w-10 h-10 bg-[#1E3A8A] text-white rounded-xl flex items-center justify-center shadow-md"><BookOpen className="w-6 h-6" /></div>
          <div>
            <h1 className="text-xl font-bold text-[#1E3A8A]">Ostad<span className="text-blue-500">AI</span></h1>
            <p className="text-xs text-gray-500">دستیار هوشمند جزوه‌های دانشگاهی</p>
          </div>
        </div>
        <button onClick={() => { handleBackToDashboard(); setCurrentView('upload'); }} className="bg-[#1E3A8A] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-800 transition shadow-md">
          <Plus className="w-5 h-5" /> یادداشت جدید
        </button>
      </header>

      <main className="max-w-5xl mx-auto mt-8 px-4 pb-20">
        
        {/* داشبورد */}
        {currentView === 'dashboard' && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              {categories.map((cat) => (
                <div key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`group relative flex flex-col items-center justify-center p-6 rounded-3xl cursor-pointer transition-all ${activeCategory === cat.id ? 'bg-[#1E3A8A] text-white shadow-lg' : 'bg-white text-gray-600 border border-gray-100 hover:shadow-md'}`}>
                  <div className={`${activeCategory === cat.id ? 'text-white' : 'text-[#1E3A8A]'} mb-3`}>{availableIcons[cat.iconKey]}</div>
                  <span className="font-bold">{cat.label}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-end mb-6">
              <h2 className="text-2xl font-bold">یادداشت‌های من</h2>
              <span className="text-sm text-gray-500">{filteredNotes.length} مورد</span>
            </div>

            {isLoading ? (
               <div className="flex justify-center items-center py-20">
                 <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
               </div>
            ) : filteredNotes.length === 0 ? (
              <div className="bg-white rounded-3xl border border-gray-100 p-16 flex flex-col items-center text-center shadow-sm">
                <FileText className="w-12 h-12 text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium">هنوز یادداشتی در این دسته نساخته‌اید.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredNotes.map((note) => (
                  <div key={note.id} className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition flex flex-col">
                    <h3 className="font-bold text-xl text-gray-800 mb-4">{note.title}</h3>
                    <div className="flex gap-2 mb-6">
                      <span className="flex items-center gap-1 bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium"><Calendar className="w-3.5 h-3.5" /> {formatDate(note.created_at)}</span>
                      <span className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-medium">{categories.find(c => c.id === note.category_id)?.label || 'عمومی'}</span>
                    </div>
                    <div className="border-t pt-4 flex justify-between items-center">
                      <button onClick={() => openNote(note)} className="text-[#1E3A8A] font-bold flex items-center gap-2 hover:underline">
                        <ArrowLeft className="w-4 h-4" /> باز کردن
                      </button>
                      <button onClick={(e) => handleDeleteNote(note.id, e)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* آپلود */}
        {currentView === 'upload' && (
          <div className="max-w-3xl mx-auto">
            <button onClick={handleBackToDashboard} className="flex items-center gap-2 text-gray-500 hover:text-blue-600 mb-6 font-medium">
              <ArrowRight className="w-5 h-5" /> بازگشت به داشبورد
            </button>

            <div className="bg-white rounded-3xl shadow-sm border p-6 mb-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">عنوان یادداشت</label>
                  <input type="text" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="مثلاً: معادله دارسی" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1E3A8A]" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">دسته‌بندی</label>
                  <select value={noteCategory} onChange={(e) => setNoteCategory(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1E3A8A] bg-white">
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center relative bg-gray-50 hover:bg-gray-100 transition">
                {selectedImage ? (
                  <div className="flex flex-col items-center">
                    <img src={selectedImage} className="max-h-64 object-contain rounded-lg mb-4 shadow-sm" />
                    <div className="flex gap-4">
                      <button onClick={handleExtract} disabled={isExtracting} className="bg-[#1E3A8A] text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-md disabled:bg-gray-400">
                        {isExtracting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                        {isExtracting ? 'در حال استخراج...' : 'استخراج متن با هوش مصنوعی'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative py-10 cursor-pointer">
                    <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <Upload className="w-12 h-12 text-[#1E3A8A] mx-auto mb-3 opacity-50" />
                    <p className="font-bold text-gray-700 text-lg">عکس جزوه را انتخاب کنید</p>
                  </div>
                )}
              </div>
              
              {errorMsg && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl mt-4 text-center border border-red-100" dir="rtl">
                  {errorMsg}
                </div>
              )}
            </div>

            {extractedText && (
              <div className="bg-white rounded-3xl shadow-sm border p-6 mb-6">
                <h3 className="font-bold text-lg mb-4">متن استخراج شده</h3>
                <textarea value={extractedText} onChange={(e) => setExtractedText(e.target.value)} className="w-full h-64 p-4 bg-gray-50 border rounded-xl resize-none outline-none focus:ring-2 focus:ring-[#1E3A8A] text-gray-800 leading-relaxed mb-4" />
                <button onClick={() => handleSaveNote(true)} className="w-full bg-green-600 text-white py-3.5 rounded-xl font-bold hover:bg-green-700 flex justify-center items-center gap-2 shadow-md">
                  <Save className="w-5 h-5" /> ذخیره یادداشت در دیتابیس
                </button>
              </div>
            )}
          </div>
        )}

        {/* جزئیات یادداشت */}
        {currentView === 'detail' && activeNote && (
          <div className="max-w-4xl mx-auto">
            <button onClick={handleBackToDashboard} className="flex items-center gap-2 text-gray-500 hover:text-blue-600 mb-6 font-medium">
              <ArrowRight className="w-5 h-5" /> بازگشت
            </button>

            <div className="text-center mb-6">
              <h1 className="text-3xl font-black text-[#1E3A8A] mb-2">{activeNote.title}</h1>
              <p className="text-gray-500">تصاویر یادداشت</p>
            </div>

            {activeNote.image_url && (
              <div className="bg-white p-4 rounded-3xl border shadow-sm mb-8 flex flex-col items-center max-w-3xl mx-auto">
                <img src={activeNote.image_url} className="max-h-72 object-contain rounded-xl mb-4 w-full" alt="جزوه" />
                <div className="flex gap-3 w-full justify-center">
                  <button className="flex-1 bg-white border border-gray-200 text-gray-700 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50"><Scissors className="w-4 h-4" /> برش نمودار</button>
                  <button className="flex-1 bg-blue-50 text-[#1E3A8A] py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-100"><Search className="w-4 h-4" /> استخراج متن</button>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center mb-4 px-2 max-w-3xl mx-auto">
              <h2 className="font-bold text-lg">پیش‌نمایش محصول نهایی</h2>
              <button onClick={handleCopyText} className="text-sm text-gray-500 flex items-center gap-1 hover:text-blue-600">
                <Copy className="w-4 h-4" /> {isCopied ? 'کپی شد!' : 'کپی متن'}
              </button>
            </div>

            <div className="flex bg-gray-100 p-1 rounded-2xl mb-6 w-full max-w-xs mx-auto">
              <button onClick={() => setViewMode('preview')} className={`flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${viewMode === 'preview' ? 'bg-white text-[#1E3A8A] shadow-sm' : 'text-gray-500'}`}>
                 پیش‌نمایش
              </button>
              <button onClick={() => setViewMode('edit')} className={`flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${viewMode === 'edit' ? 'bg-white text-[#1E3A8A] shadow-sm' : 'text-gray-500'}`}>
                <Edit className="w-4 h-4" /> ویرایش
              </button>
            </div>

            <div className="bg-[#e5e7eb] p-4 md:p-8 rounded-3xl shadow-inner max-w-3xl mx-auto mb-6">
              {viewMode === 'edit' ? (
                <textarea 
                  value={extractedText} 
                  onChange={(e) => setExtractedText(e.target.value)} 
                  className="w-full h-[600px] p-6 border-none rounded-xl bg-white outline-none focus:ring-4 focus:ring-blue-400/50 leading-loose font-mono text-sm shadow-md" 
                />
              ) : (
                <div 
                  ref={pdfRef} 
                  className="bg-white p-8 md:p-12 shadow-2xl rounded-sm min-h-[700px] relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-2 bg-[#1E3A8A]"></div>
                  
                  <div className="border-b-2 border-gray-200 pb-4 mb-8 flex justify-between items-center">
                    <div>
                      <h2 className="text-2xl font-black text-gray-800">{activeNote.title}</h2>
                      <p className="text-sm text-gray-500 mt-1">دسته‌بندی: {categories.find(c => c.id === activeNote.category_id)?.label} | تاریخ: {formatDate(activeNote.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-[#1E3A8A] text-xl tracking-tight">Ostad<span className="text-blue-500">AI</span></span>
                    </div>
                  </div>

                  <div className="text-gray-800 leading-loose text-justify prose prose-lg max-w-none 
                    prose-headings:text-[#1E3A8A] prose-headings:font-bold 
                    prose-p:mb-4 prose-p:text-justify 
                    prose-li:mb-2 prose-strong:text-gray-900">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {extractedText}
                    </ReactMarkdown>
                  </div>

                  <div className="absolute bottom-6 left-0 w-full text-center text-xs text-gray-400">
                    تولید شده توسط Ostad AI - دستیار هوشمند دانشجویان
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4 max-w-3xl mx-auto">
              <button className="flex-1 bg-white text-gray-700 py-3 rounded-xl font-bold flex justify-center items-center gap-2 border border-gray-200 hover:bg-gray-50 shadow-sm">
                <FileDown className="w-5 h-5" /> خروجی Word
              </button>
              <button onClick={handleDownloadPDF} disabled={isGeneratingPdf} className="flex-1 bg-[#1E3A8A] text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-blue-800 transition shadow-lg">
                {isGeneratingPdf ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />} دانلود PDF
              </button>
            </div>
            
            {viewMode === 'edit' && (
              <button onClick={() => handleSaveNote(false)} className="w-full mt-4 max-w-3xl mx-auto block bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 flex justify-center items-center gap-2 shadow-md">
                <Save className="w-5 h-5" /> ذخیره تغییرات
              </button>
            )}

          </div>
        )}

      </main>
    </div>
  );
}

export default App;
