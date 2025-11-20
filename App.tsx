import React, { useState, useRef } from 'react';
import { generateExam, regenerateQuestion } from './services/geminiService';
import { ExamPaper, GenerationConfig, QuestionType, Difficulty, Question } from './types';
import { ExamRenderer } from './components/ExamRenderer';
import { BookOpen, Link, FileText, Settings, Printer, Sparkles, AlertCircle, Edit3, Plus, Check, Save, FolderOpen, Upload, Image as ImageIcon } from 'lucide-react';

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
  questionCounts: INITIAL_COUNTS
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

      // Initialize specific fields based on type
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
    <div className="min-h-screen bg-gray-100 pb-12">
      
      {/* Header / Nav */}
      <nav className="bg-indigo-700 text-white shadow-md print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-yellow-300" />
            <h1 className="text-2xl font-bold tracking-wide">آزمون‌ساز هوشمند</h1>
          </div>
          <p className="text-indigo-200 text-sm hidden sm:block">طراحی سوالات امتحانی با هوش مصنوعی گوگل</p>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 mt-8 flex flex-col gap-8">
        
        {/* Configuration Panel (Hidden on Print) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:hidden">
          
          {/* Left Col: Content Input */}
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
                <span className="flex items-center gap-2"><BookOpen size={16}/> متن / کتاب</span>
              </button>
              <button 
                onClick={() => setConfig({ ...config, sourceType: 'URL' })}
                className={`pb-2 px-4 font-medium transition-colors ${config.sourceType === 'URL' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
              >
                 <span className="flex items-center gap-2"><Link size={16}/> آدرس وب‌سایت</span>
              </button>
              <button 
                onClick={() => setConfig({ ...config, sourceType: 'FILE' })}
                className={`pb-2 px-4 font-medium transition-colors ${config.sourceType === 'FILE' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
              >
                 <span className="flex items-center gap-2"><Upload size={16}/> فایل / عکس</span>
              </button>
            </div>

            {config.sourceType === 'TEXT' ? (
              <div className="space-y-2">
                <textarea
                  className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm leading-relaxed"
                  placeholder="متن کتاب درسی، جزوه یا مطلب خود را اینجا کپی کنید..."
                  value={config.content}
                  onChange={(e) => setConfig({ ...config, content: e.target.value })}
                ></textarea>
              </div>
            ) : config.sourceType === 'URL' ? (
              <div className="space-y-4">
                <div className="relative">
                  <Link className="absolute right-3 top-3 text-gray-400 w-5 h-5" />
                  <input
                    type="url"
                    className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="https://example.com/article"
                    value={config.content}
                    onChange={(e) => setConfig({ ...config, content: e.target.value })}
                  />
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p>
                    هوش مصنوعی محتوای صفحه را تحلیل می‌کند.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                      <input 
                        type="file" 
                        accept="image/*,application/pdf" 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleFileUpload}
                      />
                      <ImageIcon className="w-10 h-10 text-gray-400 mb-2" />
                      <p className="text-sm font-bold text-gray-700">برای بارگذاری کلیک کنید یا فایل را اینجا رها کنید</p>
                      <p className="text-xs text-gray-500 mt-1">تصاویر (JPG, PNG) یا PDF</p>
                  </div>
                  {config.fileData && (
                      <div className="bg-green-50 p-3 rounded border border-green-200 flex items-center gap-2 text-green-800 text-sm">
                          <Check size={16} />
                          <span>فایل با موفقیت انتخاب شد. ({config.content})</span>
                      </div>
                  )}
              </div>
            )}
          </div>

          {/* Right Col: Settings */}
          <div className="lg:col-span-5 bg-white rounded-xl shadow-sm p-6 border border-gray-200 h-fit">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2 text-gray-700">
                  <Settings className="w-5 h-5" />
                  تنظیمات سوالات
                </h2>
                <div className="flex gap-1">
                    <button 
                        onClick={handleSaveConfig}
                        className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                        title="ذخیره تنظیمات فعلی"
                    >
                        <Save size={18} />
                    </button>
                     <button 
                        onClick={handleLoadConfig}
                        className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                        title="بازیابی تنظیمات ذخیره شده"
                    >
                        <FolderOpen size={18} />
                    </button>
                </div>
            </div>

            <div className="space-y-5">
              
              {/* Difficulty */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">سطح دشواری آزمون</label>
                <select 
                    value={config.difficulty}
                    onChange={(e) => setConfig({...config, difficulty: e.target.value as Difficulty})}
                    className="w-full p-2 border rounded-lg text-sm"
                >
                    <option value="Easy">آسان</option>
                    <option value="Medium">متوسط</option>
                    <option value="Hard">دشوار</option>
                </select>
              </div>

              {/* Counters */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">تعداد هر نوع سوال</label>
                <div className="space-y-2 bg-gray-50 p-3 rounded-lg border">
                    {Object.values(QuestionType).map((type) => (
                        <div key={type} className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">{QUESTION_TYPE_LABELS[type]}</span>
                            <div className="flex items-center border bg-white rounded-md overflow-hidden">
                                <button 
                                    onClick={() => updateCount(type, -1)}
                                    className="px-3 py-1 hover:bg-gray-100 border-l"
                                >-</button>
                                <input 
                                    type="number" 
                                    className="w-12 text-center text-sm focus:outline-none"
                                    value={config.questionCounts[type]}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        setConfig(prev => ({
                                            ...prev,
                                            questionCounts: { ...prev.questionCounts, [type]: val }
                                        }));
                                    }}
                                />
                                <button 
                                    onClick={() => updateCount(type, 1)}
                                    className="px-3 py-1 hover:bg-gray-100 border-r"
                                >+</button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-2 text-left text-xs text-gray-500">
                    مجموع سوالات: {totalQuestions}
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading}
                className={`w-full py-3 rounded-lg font-bold text-white shadow-lg transition-all transform active:scale-95 flex justify-center items-center gap-2
                  ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700'}`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    در حال طراحی...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    طراحی سوالات
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        
        {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-center font-bold">
                {error}
            </div>
        )}

        {/* Results Section */}
        {exam && (
            <div className="animate-fade-in pb-20">
                 {/* Toolbar */}
                 <div className="sticky top-0 z-20 bg-gray-800 text-white p-3 rounded-lg shadow-lg mb-6 flex flex-wrap justify-between items-center gap-4 print:hidden">
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg font-bold">پیش‌نمایش آزمون</h2>
                        <div className="bg-gray-700 px-3 py-1 rounded-full text-xs">سایز A4</div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setIsEditing(!isEditing)}
                            className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${isEditing ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                        >
                            {isEditing ? <Check size={18}/> : <Edit3 size={18} />}
                            {isEditing ? 'پایان ویرایش' : 'ویرایش دستی'}
                        </button>

                        {isEditing && (
                            <div className="flex items-center bg-blue-600 rounded overflow-hidden">
                                <select 
                                    value={addQuestionType}
                                    onChange={(e) => setAddQuestionType(e.target.value as QuestionType)}
                                    className="bg-blue-700 text-white text-xs p-2 border-none outline-none cursor-pointer hover:bg-blue-800"
                                >
                                    {Object.entries(QUESTION_TYPE_LABELS).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                                <button 
                                    onClick={handleAddQuestion}
                                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors border-l border-blue-500"
                                >
                                    <Plus size={18} />
                                    افزودن
                                </button>
                            </div>
                        )}

                        <button 
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-900 font-bold rounded hover:bg-gray-100 transition-colors"
                        >
                            <Printer size={18} />
                            دانلود PDF / چاپ
                        </button>
                    </div>
                 </div>

                 {/* Visual Feedback for Edit Mode */}
                 {isEditing && (
                     <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded flex items-center gap-2 print:hidden">
                         <Edit3 size={16}/>
                         شما در حالت ویرایش هستید. با استفاده از دکمه‌های فلش، سوالات را بین صفحات جابجا کنید تا چیدمان مناسب چاپ را بدست آورید.
                     </div>
                 )}

                 <ExamRenderer 
                    exam={exam} 
                    isEditing={isEditing}
                    onUpdateExam={setExam}
                    onRegenerateQuestion={handleRegenerateQuestion}
                    refProp={examRef} 
                />
            </div>
        )}

      </main>
    </div>
  );
}

export default App;