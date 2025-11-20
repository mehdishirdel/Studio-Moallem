import React, { useState, useRef } from 'react';
import { generateExam, regenerateQuestion } from './services/geminiService';
import { ExamPaper, GenerationConfig, QuestionType, Difficulty, Question } from './types';
import { ExamRenderer } from './components/ExamRenderer';
import { BookOpen, Link, FileText, Settings, Printer, Sparkles, AlertCircle, Edit3, Plus, Check, Save, FolderOpen, Upload, Image as ImageIcon, Download, Eye, X, FilePlus, FileMinus } from 'lucide-react';

const INITIAL_COUNTS: Record<QuestionType, number> = {
  [QuestionType.MULTIPLE_CHOICE]: 4,
  [QuestionType.TRUE_FALSE]: 3,
  [QuestionType.FILL_IN_THE_BLANK]: 3,
  [QuestionType.MATCHING]: 1,
  [QuestionType.SHORT_ANSWER]: 3,
  [QuestionType.LONG_ANSWER]: 1,
};

const INITIAL_CONFIG: GenerationConfig = {
  sourceType: 'TEXT',
  content: '',
  difficulty: 'Medium',
  questionCounts: INITIAL_COUNTS,
  pageCount: 1
};

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  [QuestionType.MULTIPLE_CHOICE]: 'چهار گزینه‌ای',
  [QuestionType.TRUE_FALSE]: 'صحیح / غلط',
  [QuestionType.FILL_IN_THE_BLANK]: 'جای خالی',
  [QuestionType.MATCHING]: 'وصل کردنی',
  [QuestionType.SHORT_ANSWER]: 'پاسخ کوتاه',
  [QuestionType.LONG_ANSWER]: 'تشریحی',
};

function App() {
  const [config, setConfig] = useState<GenerationConfig>(INITIAL_CONFIG);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exam, setExam] = useState<ExamPaper | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [addQuestionType, setAddQuestionType] = useState<QuestionType>(QuestionType.SHORT_ANSWER);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [questionSpacing, setQuestionSpacing] = useState<number>(5);
  
  const examRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    if (config.sourceType !== 'FILE' && !config.content.trim()) {
      setError("لطفا متن یا آدرس اینترنتی را وارد کنید.");
      return;
    }
    if (config.sourceType === 'FILE' && !config.fileData) {
        setError("لطفا یک فایل بارگذاری کنید.");
        return;
    }
    
    const totalQuestions = (Object.values(config.questionCounts) as number[]).reduce((a, b) => a + b, 0);
    if (totalQuestions === 0) {
        setError("حداقل تعداد یک نوع سوال را مشخص کنید.");
        return;
    }
    if (totalQuestions > 40) {
        setError("مجموع سوالات نمی‌تواند بیشتر از ۴۰ باشد.");
        return;
    }

    setLoading(true);
    setError(null);
    setExam(null);
    setIsEditing(false);

    try {
      const result = await generateExam(config);
      setExam(result);
    } catch (e: any) {
      setError(e.message || "خطایی رخ داده است.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const togglePdfMode = (enable: boolean) => {
    const el = document.getElementById('exam-wrapper');
    if (el) {
        if (enable) el.classList.add('pdf-mode');
        else el.classList.remove('pdf-mode');
    }
  };

  const getPdfOptions = (filename: string) => ({
    margin: 0, 
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { 
        scale: 2, 
        useCORS: true, 
        scrollY: 0,
        letterRendering: true,
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: 'css' }
  });

  const processPdf = async (action: 'save' | 'preview') => {
    const sheets = document.querySelectorAll('.sheet');
    if (!sheets.length) return;
    
    setIsGeneratingPdf(true);
    togglePdfMode(true);

    try {
        // @ts-ignore
        if (window.html2pdf) {
            const filename = action === 'save' 
                ? `exam-${new Date().toISOString().split('T')[0]}.pdf`
                : 'preview.pdf';
                
            const opt = getPdfOptions(filename);
            
            // Create worker with the first sheet
            // @ts-ignore
            let worker = window.html2pdf().set(opt).from(sheets[0]).toPdf();

            // Chain subsequent sheets as new pages
            for (let i = 1; i < sheets.length; i++) {
                worker = worker.get('pdf').then((pdf: any) => {
                    pdf.addPage();
                }).from(sheets[i]).toContainer().toCanvas().toPdf();
            }
            
            if (action === 'save') {
                await worker.save();
            } else {
                const pdfBlobUrl = await worker.output('bloburl');
                setPreviewUrl(pdfBlobUrl);
                setShowPreviewModal(true);
            }
        } else {
            alert("کتابخانه PDF بارگیری نشده است.");
        }
    } catch (err) {
        console.error(err);
        alert("خطا در پردازش PDF");
    } finally {
        togglePdfMode(false);
        setIsGeneratingPdf(false);
    }
  };

  const handleDownloadPDF = () => processPdf('save');
  const handlePreviewPDF = () => processPdf('preview');

  const closePreview = () => {
      setShowPreviewModal(false);
      if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
      }
  };

  const handleAddQuestion = () => {
      if (!exam) return;
      const newId = Math.max(...exam.questions.map(q => q.id), 0) + 1;
      const lastPage = exam.questions.length > 0 ? Math.max(...exam.questions.map(q => q.page || 1)) : 1;
      
      let newQuestion: Question = {
          id: newId,
          type: addQuestionType,
          text: "سوال جدید...",
          learningObjective: "هدف آموزشی جدید",
          difficulty: 'Medium',
          page: lastPage
      };

      switch(addQuestionType) {
          case QuestionType.MULTIPLE_CHOICE:
              newQuestion.options = ['گزینه ۱', 'گزینه ۲', 'گزینه ۳', 'گزینه ۴'];
              break;
          case QuestionType.MATCHING:
              newQuestion.pairs = [
                  {left: 'مورد الف', right: 'گزینه ۱'},
                  {left: 'مورد ب', right: 'گزینه ۲'}
              ];
              newQuestion.text = "موارد مربوطه را به هم وصل کنید.";
              break;
          case QuestionType.TRUE_FALSE:
              newQuestion.text = "این گزاره صحیح است.";
              break;
          case QuestionType.FILL_IN_THE_BLANK:
              newQuestion.text = "........ پایتخت ایران است.";
              break;
      }

      setExam({
          ...exam,
          questions: [...exam.questions, newQuestion]
      });
  };

  const updatePageCount = (delta: number) => {
      if (!exam) return;
      const newCount = Math.max(1, (exam.pageCount || 1) + delta);
      setExam({ ...exam, pageCount: newCount });
  };

  const handleRegenerateQuestion = async (qId: number, newDifficulty: Difficulty) => {
      if (!exam) return;
      const questionToUpdate = exam.questions.find(q => q.id === qId);
      if (!questionToUpdate) return;

      const originalText = questionToUpdate.text;
      const tempQuestions = exam.questions.map(q => q.id === qId ? { ...q, text: "در حال بازنویسی..." } : q);
      setExam({ ...exam, questions: tempQuestions });

      try {
          const contextSummary = config.sourceType === 'TEXT' ? config.content.substring(0, 500) : "Based on provided file"; 
          const newQ = await regenerateQuestion(questionToUpdate, newDifficulty, contextSummary);
          
          setExam(prev => prev ? ({
              ...prev,
              questions: prev.questions.map(q => q.id === qId ? { ...newQ, id: qId, page: q.page } : q)
          }) : null);
      } catch (e) {
          console.error(e);
          setExam(prev => prev ? ({
              ...prev,
              questions: prev.questions.map(q => q.id === qId ? { ...q, text: originalText } : q)
          }) : null);
      }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 10 * 1024 * 1024) {
          setError("حجم فایل نباید بیشتر از ۱۰ مگابایت باشد.");
          return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
          const base64String = reader.result as string;
          const base64Data = base64String.split(',')[1];
          
          setConfig({
              ...config,
              fileData: {
                  mimeType: file.type,
                  data: base64Data
              },
              content: `File: ${file.name}`
          });
          setError(null);
      };
      reader.readAsDataURL(file);
  };

  const updateCount = (type: QuestionType, delta: number) => {
      setConfig(prev => ({
          ...prev,
          questionCounts: {
              ...prev.questionCounts,
              [type]: Math.max(0, prev.questionCounts[type] + delta)
          }
      }));
  };

  const handleSaveConfig = () => {
    try {
      localStorage.setItem('examGeniusConfig', JSON.stringify(config));
      alert('تنظیمات فعلی با موفقیت ذخیره شد.');
    } catch (e) {
      console.error("Save failed", e);
      alert('خطا در ذخیره تنظیمات.');
    }
  };

  const handleLoadConfig = () => {
    try {
      const saved = localStorage.getItem('examGeniusConfig');
      if (saved) {
        const parsed = JSON.parse(saved);
        setConfig({ ...INITIAL_CONFIG, ...parsed });
        alert('تنظیمات ذخیره شده بازیابی شد.');
      } else {
        alert('هیچ تنظیماتی ذخیره نشده است.');
      }
    } catch (e) {
      console.error("Load failed", e);
      alert('خطا در بازیابی تنظیمات.');
    }
  };

  const totalQuestions = (Object.values(config.questionCounts) as number[]).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-gray-100 pb-12 font-sans">
      <style>{`
        .sheet {
            width: 210mm;
            min-height: 297mm;
            padding: 15mm;
            margin: 10mm auto;
            background: white;
            box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
            position: relative;
            box-sizing: border-box;
            direction: rtl;
            overflow: hidden;
        }

        .keep-together {
            break-inside: avoid;
            page-break-inside: avoid;
        }

        tr {
            page-break-inside: avoid;
        }

        .pdf-mode {
            background-color: white !important;
            width: 210mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            display: block !important;
        }
        
        #exam-wrapper.pdf-mode {
            gap: 0 !important;
        }

        .pdf-mode .sheet {
            margin: 0 !important;
            box-shadow: none !important;
            width: 210mm !important; 
            height: 297mm !important;
            padding: 15mm !important;
            page-break-after: always;
            break-after: page;
        }

        .pdf-mode .sheet:last-child {
            page-break-after: auto;
            break-after: auto;
        }

        .pdf-mode button, .pdf-mode .print\\:hidden, .pdf-mode .group-hover\\:opacity-100 {
            display: none !important;
        }

        .pdf-mode input, .pdf-mode textarea {
            border: none !important;
            background: transparent !important;
            resize: none !important;
            padding: 0 !important;
        }

        .exam-scroll-container::-webkit-scrollbar {
            height: 10px;
            width: 10px;
        }
        .exam-scroll-container::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 5px;
        }
      `}</style>

      <nav className="bg-indigo-700 text-white shadow-md print:hidden z-30 relative">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-yellow-300" />
            <h1 className="text-2xl font-bold tracking-wide">آزمون‌ساز هوشمند</h1>
          </div>
          <p className="text-indigo-200 text-sm hidden sm:block">طراحی سوالات امتحانی با هوش مصنوعی گوگل</p>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 mt-8 flex flex-col gap-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:hidden">
          
          <div className="lg:col-span-7 bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-700">
              <FileText className="w-5 h-5" />
              منبع آزمون
            </h2>

            <div className="flex gap-4 mb-4 border-b">
              <button 
                onClick={() => setConfig({ ...config, sourceType: 'TEXT' })}
                className={`pb-2 px-4 font-medium transition-colors ${config.sourceType === 'TEXT' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
              >
                <span className="flex items-center gap-2"><BookOpen size={18}/> متن</span>
              </button>
              <button 
                onClick={() => setConfig({ ...config, sourceType: 'URL' })}
                className={`pb-2 px-4 font-medium transition-colors ${config.sourceType === 'URL' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
              >
                <span className="flex items-center gap-2"><Link size={18}/> لینک</span>
              </button>
              <button 
                onClick={() => setConfig({ ...config, sourceType: 'FILE' })}
                className={`pb-2 px-4 font-medium transition-colors ${config.sourceType === 'FILE' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
              >
                <span className="flex items-center gap-2"><Upload size={18}/> فایل (تصویر/کتاب)</span>
              </button>
            </div>

            <div className="min-h-[200px]">
                {config.sourceType === 'TEXT' && (
                    <textarea
                    className="w-full h-48 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="متن کتاب درسی یا محتوای آموزشی را اینجا وارد کنید..."
                    value={config.content}
                    onChange={(e) => setConfig({ ...config, content: e.target.value })}
                    />
                )}
                {config.sourceType === 'URL' && (
                    <div className="flex flex-col gap-2">
                        <input
                        type="url"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="https://example.com/article"
                        value={config.content}
                        onChange={(e) => setConfig({ ...config, content: e.target.value })}
                        />
                        <p className="text-xs text-gray-500 mt-2">لینک یک مقاله یا صفحه آموزشی را وارد کنید. هوش مصنوعی محتوای آن را تحلیل خواهد کرد.</p>
                    </div>
                )}
                {config.sourceType === 'FILE' && (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center text-gray-500 gap-4 hover:bg-gray-50 transition-colors relative">
                        <input 
                            type="file" 
                            accept="image/*,application/pdf"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={handleFileUpload}
                        />
                        {config.fileData ? (
                            <div className="flex flex-col items-center text-green-600">
                                <Check size={40} />
                                <p className="font-medium">{config.content}</p>
                                <p className="text-xs mt-1">برای تغییر فایل کلیک کنید</p>
                            </div>
                        ) : (
                            <>
                                <ImageIcon size={40} className="text-gray-400" />
                                <p>برای آپلود تصویر یا PDF کلیک کنید یا فایل را اینجا رها کنید</p>
                                <p className="text-xs text-gray-400">(حداکثر ۱۰ مگابایت)</p>
                            </>
                        )}
                    </div>
                )}
            </div>
          </div>

          <div className="lg:col-span-5 bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2 text-gray-700">
                <Settings className="w-5 h-5" />
                تنظیمات آزمون
                </h2>
                <div className="flex gap-2">
                    <button onClick={handleSaveConfig} className="p-1.5 text-gray-500 hover:text-indigo-600 rounded hover:bg-indigo-50" title="ذخیره تنظیمات">
                        <Save size={18}/>
                    </button>
                    <button onClick={handleLoadConfig} className="p-1.5 text-gray-500 hover:text-indigo-600 rounded hover:bg-indigo-50" title="بازیابی تنظیمات">
                        <FolderOpen size={18}/>
                    </button>
                </div>
            </div>

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">سطح دشواری</label>
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map((level) => (
                            <button
                                key={level}
                                onClick={() => setConfig({ ...config, difficulty: level })}
                                className={`flex-1 py-1.5 text-sm rounded-md transition-all ${
                                    config.difficulty === level 
                                    ? 'bg-white text-indigo-600 shadow-sm font-bold' 
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {level === 'Easy' ? 'آسان' : level === 'Medium' ? 'متوسط' : 'دشوار'}
                            </button>
                        ))}
                    </div>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">تعداد سوالات ({totalQuestions})</label>
                    <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                        {(Object.keys(INITIAL_COUNTS) as QuestionType[]).map((type) => (
                            <div key={type} className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">{QUESTION_TYPE_LABELS[type]}</span>
                                <div className="flex items-center border rounded-md bg-gray-50">
                                    <button 
                                        onClick={() => updateCount(type, -1)}
                                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 text-gray-600"
                                    >-</button>
                                    <span className="w-8 text-center font-medium">{config.questionCounts[type]}</span>
                                    <button 
                                        onClick={() => updateCount(type, 1)}
                                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 text-indigo-600"
                                    >+</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">تعداد صفحات</label>
                    <input 
                        type="number" 
                        min="1" 
                        max="10" 
                        value={config.pageCount} 
                        onChange={(e) => setConfig({...config, pageCount: parseInt(e.target.value) || 1})}
                        className="w-full p-2 border rounded"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">فاصله بین سوالات (تراکم)</label>
                    <input 
                        type="range" 
                        min="2" 
                        max="12" 
                        step="1"
                        value={questionSpacing}
                        onChange={(e) => setQuestionSpacing(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>کم</span>
                        <span>زیاد</span>
                    </div>
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                >
                    {loading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            در حال طراحی آزمون...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-5 h-5" />
                            طراحی آزمون
                        </>
                    )}
                </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-r-4 border-red-500 p-4 rounded-md flex items-center gap-3 text-red-700 print:hidden">
            <AlertCircle size={24} />
            <p>{error}</p>
          </div>
        )}

        {exam && (
          <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200 print:hidden sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <h3 className="font-bold text-lg text-gray-800">پیش‌نمایش آزمون</h3>
                    <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium cursor-pointer hover:bg-indigo-100 transition-colors" onClick={() => setIsEditing(!isEditing)}>
                        <Edit3 size={16} />
                        {isEditing ? 'خروج از حالت ویرایش' : 'حالت ویرایش'}
                    </div>
                    <div className="h-6 w-px bg-gray-300 mx-2"></div>
                     {/* Add Page Controls */}
                     <div className="flex items-center gap-2">
                        <button onClick={() => updatePageCount(1)} className="flex items-center gap-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded">
                            <FilePlus size={14} /> صفحه
                        </button>
                        <button onClick={() => updatePageCount(-1)} className="flex items-center gap-1 text-sm bg-gray-100 hover:bg-gray-200 text-red-600 px-2 py-1 rounded">
                            <FileMinus size={14} />
                        </button>
                     </div>
                </div>

                <div className="flex gap-3">
                    {isEditing && (
                        <div className="flex items-center border border-indigo-200 rounded-lg overflow-hidden bg-indigo-50">
                            <select 
                                className="bg-transparent text-xs p-2 text-indigo-800 font-medium focus:outline-none border-l border-indigo-200"
                                value={addQuestionType}
                                onChange={(e) => setAddQuestionType(e.target.value as QuestionType)}
                            >
                                {Object.entries(QUESTION_TYPE_LABELS).map(([val, label]) => (
                                    <option key={val} value={val}>{label}</option>
                                ))}
                            </select>
                            <button 
                                onClick={handleAddQuestion}
                                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
                            >
                                <Plus size={16} /> افزودن سوال
                            </button>
                        </div>
                    )}
                    
                    <button 
                        onClick={handlePreviewPDF}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                        disabled={isGeneratingPdf}
                    >
                        <Eye size={18} />
                        پیش‌نمایش PDF
                    </button>
                    
                    <button 
                        onClick={handleDownloadPDF}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                        disabled={isGeneratingPdf}
                    >
                        <Download size={18} />
                        {isGeneratingPdf ? 'در حال ایجاد...' : 'دانلود فایل PDF'}
                    </button>
                    
                    <button 
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-medium transition-colors shadow-sm"
                    >
                        <Printer size={18} />
                        چاپ
                    </button>
                </div>
            </div>

            {/* Exam Renderer */}
            <ExamRenderer 
                exam={exam}
                isEditing={isEditing}
                onUpdateExam={setExam}
                onRegenerateQuestion={handleRegenerateQuestion}
                refProp={examRef}
                questionSpacing={questionSpacing}
            />
          </div>
        )}
      </main>
      
      {/* PDF Preview Modal */}
      {showPreviewModal && previewUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
              <div className="bg-white rounded-lg w-full max-w-6xl h-[90vh] flex flex-col relative">
                  <div className="flex justify-between items-center p-4 border-b">
                      <h3 className="font-bold text-lg">پیش‌نمایش فایل خروجی</h3>
                      <button onClick={closePreview} className="p-2 hover:bg-gray-100 rounded-full">
                          <X size={24} />
                      </button>
                  </div>
                  <div className="flex-grow bg-gray-100 p-4 overflow-hidden">
                      <iframe 
                        src={previewUrl} 
                        className="w-full h-full rounded border shadow-lg" 
                        title="PDF Preview"
                      />
                  </div>
                  <div className="p-4 border-t flex justify-end gap-3 bg-gray-50">
                      <button onClick={closePreview} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded">بستن</button>
                      <button onClick={handleDownloadPDF} className="px-4 py-2 bg-green-600 text-white font-medium rounded hover:bg-green-700 flex items-center gap-2">
                          <Download size={18} /> دانلود نهایی
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

export default App;