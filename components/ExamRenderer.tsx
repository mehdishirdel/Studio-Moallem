import React, { useMemo } from 'react';
import { ExamPaper, QuestionType, Question, Difficulty } from '../types';
import { Trash2, RefreshCw, Plus, ArrowDown, ArrowUp } from 'lucide-react';

interface ExamRendererProps {
  exam: ExamPaper;
  isEditing: boolean;
  onUpdateExam: (exam: ExamPaper) => void;
  onRegenerateQuestion: (qId: number, newDifficulty: Difficulty) => void;
  refProp?: React.Ref<HTMLDivElement>;
  questionSpacing?: number;
}

const TYPE_ORDER: QuestionType[] = [
  QuestionType.TRUE_FALSE,
  QuestionType.MATCHING,
  QuestionType.MULTIPLE_CHOICE,
  QuestionType.FILL_IN_THE_BLANK,
  QuestionType.SHORT_ANSWER,
  QuestionType.LONG_ANSWER
];

const SECTION_TITLES: Record<QuestionType, string> = {
  [QuestionType.TRUE_FALSE]: 'سوالات صحیح و غلط',
  [QuestionType.MATCHING]: 'سوالات وصل کردنی',
  [QuestionType.MULTIPLE_CHOICE]: 'سوالات چهار گزینه‌ای',
  [QuestionType.FILL_IN_THE_BLANK]: 'جاهای خالی را با کلمات مناسب پر کنید',
  [QuestionType.SHORT_ANSWER]: 'سوالات پاسخ کوتاه',
  [QuestionType.LONG_ANSWER]: 'سوالات تشریحی',
};

export const ExamRenderer: React.FC<ExamRendererProps> = ({ 
    exam, 
    isEditing, 
    onUpdateExam, 
    onRegenerateQuestion,
    refProp,
    questionSpacing = 5
}) => {

  const updateHeader = (field: string, value: string | number) => {
    onUpdateExam({
        ...exam,
        header: { ...exam.header, [field]: value }
    });
  };

  const updateQuestion = (id: number, field: string, value: any) => {
    const newQuestions = exam.questions.map(q => 
        q.id === id ? { ...q, [field]: value } : q
    );
    onUpdateExam({ ...exam, questions: newQuestions });
  };

  const moveQuestionPage = (id: number, direction: 'next' | 'prev') => {
      let newMaxPage = exam.pageCount || 1;
      const newQuestions = exam.questions.map(q => {
          if (q.id === id) {
              const currentPage = q.page || 1;
              const newPage = direction === 'next' ? currentPage + 1 : Math.max(1, currentPage - 1);
              
              // If moving to a new page beyond current count, update the count
              if (newPage > newMaxPage) {
                  newMaxPage = newPage;
              }
              
              return { ...q, page: newPage };
          }
          return q;
      });
      
      onUpdateExam({ 
          ...exam, 
          questions: newQuestions,
          pageCount: newMaxPage
      });
  };

  const deleteQuestion = (id: number) => {
    const newQuestions = exam.questions.filter(q => q.id !== id);
    onUpdateExam({ ...exam, questions: newQuestions });
  };

  const addOption = (qId: number) => {
     const q = exam.questions.find(q => q.id === qId);
     if(q && q.options) {
         updateQuestion(qId, 'options', [...q.options, 'گزینه جدید']);
     }
  };

  const updateOption = (qId: number, idx: number, val: string) => {
    const q = exam.questions.find(q => q.id === qId);
    if(q && q.options) {
        const newOpts = [...q.options];
        newOpts[idx] = val;
        updateQuestion(qId, 'options', newOpts);
    }
  };

  // Group questions by page, then by type
  const pages = useMemo(() => {
      const pageMap: Record<number, Question[]> = {};
      exam.questions.forEach(q => {
          const p = q.page || 1;
          if (!pageMap[p]) pageMap[p] = [];
          pageMap[p].push(q);
      });
      return pageMap;
  }, [exam.questions]);

  // Calculate max page based on configuration and existing questions
  const maxPageWithQuestions = Math.max(0, ...Object.keys(pages).map(Number));
  const totalRenderPages = Math.max(exam.pageCount || 1, maxPageWithQuestions);
  const pageNumbers = Array.from({ length: totalRenderPages }, (_, i) => i + 1);
  
  // Global counter needs to persist across pages
  let globalQuestionIndex = 0;

  return (
    <div 
        className="w-full flex flex-col items-center gap-8 overflow-x-auto exam-scroll-container print:overflow-visible print:block print:h-auto" 
        id="exam-wrapper"
        ref={refProp}
    >
      
      {pageNumbers.map((pageNum, pageIndex) => {
        const pageQuestions = pages[pageNum] || [];
        const groupedQuestions: Partial<Record<QuestionType, Question[]>> = {};
        
        // Populate grouped questions if any exist on this page
        pageQuestions.forEach(q => {
            if (!groupedQuestions[q.type]) groupedQuestions[q.type] = [];
            groupedQuestions[q.type]!.push(q);
        });

        return (
            <div 
                key={pageNum}
                className="sheet font-sans" 
                // The .sheet class now handles the A4 dimensions and padding directly
            >
                <div className="flex flex-col h-full box-border">
                
                {/* Header - Redesigned for Professional Look (Only on Page 1) */}
                {pageNum === 1 ? (
                    <div className="mb-8 font-sans text-gray-900">
                        <div className="border-2 border-gray-800 rounded-xl p-1">
                            <div className="border border-gray-800 rounded-lg p-4 bg-white relative">
                                {/* Decor */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 z-10">
                                    <span className="font-bold text-xl">بسمه تعالی</span>
                                </div>

                                <div className="grid grid-cols-12 gap-4 pt-2">
                                    {/* Right Section */}
                                    <div className="col-span-4 flex flex-col justify-between gap-3 text-sm border-l border-gray-300 pl-4">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold whitespace-nowrap">نام آموزشگاه:</span>
                                            {isEditing ? (
                                                <input 
                                                    className="w-full border-b border-dotted border-gray-400 focus:outline-none bg-transparent text-right" 
                                                    value={exam.header.schoolName}
                                                    onChange={(e) => updateHeader('schoolName', e.target.value)}
                                                />
                                            ) : (
                                                <span className="font-medium truncate">{exam.header.schoolName || '....................'}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold whitespace-nowrap">نام درس:</span>
                                            {isEditing ? (
                                                <input 
                                                    className="w-full border-b border-dotted border-gray-400 focus:outline-none bg-transparent text-right" 
                                                    value={exam.header.title}
                                                    onChange={(e) => updateHeader('title', e.target.value)}
                                                />
                                            ) : (
                                                <span className="font-medium truncate">{exam.header.title}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold whitespace-nowrap">پایه/کلاس:</span>
                                            {isEditing ? (
                                                <input 
                                                    className="w-full border-b border-dotted border-gray-400 focus:outline-none bg-transparent text-right" 
                                                    value={exam.header.grade}
                                                    onChange={(e) => updateHeader('grade', e.target.value)}
                                                />
                                            ) : (
                                                <span className="font-medium truncate">{exam.header.grade || '....................'}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Center Section (Name) */}
                                    <div className="col-span-4 flex flex-col justify-center gap-4 text-sm">
                                        <div className="flex flex-col gap-2 w-full">
                                            <span className="font-bold">نام و نام خانوادگی:</span>
                                            <div className="w-full border-b-2 border-dotted border-gray-400 h-6"></div>
                                        </div>
                                        <div className="flex flex-col gap-2 w-full">
                                            <span className="font-bold">شماره کلاس/صندلی:</span>
                                            <div className="w-full border-b-2 border-dotted border-gray-400 h-6"></div>
                                        </div>
                                    </div>

                                    {/* Left Section */}
                                    <div className="col-span-4 flex flex-col justify-between gap-3 text-sm border-r border-gray-300 pr-4">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold whitespace-nowrap">تاریخ آزمون:</span>
                                            <span className="font-medium font-mono" dir="ltr">14__/___/___</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold whitespace-nowrap">مدت آزمون:</span>
                                            {isEditing ? (
                                                <input 
                                                    className="w-12 text-center border-b border-dotted border-gray-400 focus:outline-none bg-transparent" 
                                                    value={exam.header.durationMinutes}
                                                    onChange={(e) => updateHeader('durationMinutes', e.target.value)}
                                                />
                                            ) : (
                                                <span className="font-medium">{exam.header.durationMinutes}</span>
                                            )}
                                            <span className="text-xs">دقیقه</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold whitespace-nowrap">صفحه:</span>
                                            <span className="font-medium">{totalRenderPages} صفحه</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                   // Minimal Header for subsequent pages
                   <div className="border-b-2 border-gray-800 pb-2 mb-6 flex justify-between items-center text-xs text-gray-600 keep-together font-sans">
                       <span className="font-bold text-gray-800">{exam.header.title} - صفحه {pageNum} از {totalRenderPages}</span>
                       <span>نام و نام خانوادگی: ......................................................</span>
                   </div>
                )}
                
                {/* Page Content Area */}
                <div className="flex-grow space-y-4">
                    {pageQuestions.length === 0 && (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 border-2 border-dashed border-gray-200 rounded-lg font-sans">
                            {isEditing ? "صفحه خالی (سوالات را اینجا منتقل کنید)" : ""}
                        </div>
                    )}

                    {TYPE_ORDER.map((type) => {
                        const questions = groupedQuestions[type];
                        if (!questions || questions.length === 0) return null;

                        return (
                            <div key={type} className="border border-gray-400 rounded-lg overflow-hidden keep-together">
                                {/* Section Header */}
                                <div className="bg-gray-100 px-3 py-1 border-b border-gray-400 text-sm font-bold text-gray-800 flex justify-between items-center keep-together font-sans">
                                    <span className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-gray-800 rounded-sm"></span>
                                        {SECTION_TITLES[type]}
                                    </span>
                                </div>

                                <div 
                                    className="p-3 flex flex-col" 
                                    style={{ gap: `${questionSpacing * 0.25}rem` }}
                                >
                                    {questions.map((q) => {
                                        globalQuestionIndex++;
                                        return (
                                            <div key={q.id} className="relative group keep-together">
                                                {/* Editing Controls */}
                                                {isEditing && (
                                                    <div className="absolute -right-12 top-0 flex flex-col gap-1 print:hidden opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                        <button onClick={() => deleteQuestion(q.id)} className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200" title="حذف">
                                                            <Trash2 size={14} />
                                                        </button>
                                                        <button onClick={() => moveQuestionPage(q.id, 'prev')} className="p-1 bg-yellow-100 text-yellow-600 rounded hover:bg-yellow-200" title="صفحه قبل">
                                                            <ArrowUp size={14} />
                                                        </button>
                                                        <button onClick={() => moveQuestionPage(q.id, 'next')} className="p-1 bg-yellow-100 text-yellow-600 rounded hover:bg-yellow-200" title="صفحه بعد">
                                                            <ArrowDown size={14} />
                                                        </button>
                                                        <div className="relative group/diff">
                                                            <button className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200">
                                                                <RefreshCw size={14} />
                                                            </button>
                                                            <div className="absolute right-full top-0 hidden group-hover/diff:flex bg-white shadow-lg border rounded ml-1 z-10 w-24 flex-col font-sans">
                                                                <button onClick={() => onRegenerateQuestion(q.id, 'Easy')} className="px-2 py-1 text-xs hover:bg-gray-100 text-right">آسان</button>
                                                                <button onClick={() => onRegenerateQuestion(q.id, 'Medium')} className="px-2 py-1 text-xs hover:bg-gray-100 text-right">متوسط</button>
                                                                <button onClick={() => onRegenerateQuestion(q.id, 'Hard')} className="px-2 py-1 text-xs hover:bg-gray-100 text-right">دشوار</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex items-start gap-2">
                                                    {/* Question Number & Score */}
                                                    <div className="flex flex-col items-center gap-1 pt-1">
                                                        <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-black text-white rounded-full text-[10px] font-bold font-sans">
                                                            {globalQuestionIndex}
                                                        </span>
                                                        <div className="w-6 h-6 border border-gray-600 bg-white rounded-[2px]"></div>
                                                    </div>
                                                    
                                                    <div className="flex-grow mr-1">
                                                        <div className="flex justify-between items-start gap-2">
                                                            {isEditing ? (
                                                                <textarea 
                                                                    className="w-full p-1 border border-gray-300 rounded focus:border-indigo-500 focus:ring-1 text-base bg-gray-50 font-sans leading-7"
                                                                    value={q.text}
                                                                    onChange={(e) => updateQuestion(q.id, 'text', e.target.value)}
                                                                    rows={2}
                                                                />
                                                            ) : (
                                                                <h3 className="font-sans font-medium text-base text-justify leading-8 text-gray-900">{q.text}</h3>
                                                            )}
                                                        </div>
                                                        
                                                        {/* Options Render */}
                                                        <div className="mt-1 pr-1">
                                                            {q.type === QuestionType.MULTIPLE_CHOICE && q.options && (
                                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 mt-2">
                                                                    {q.options.map((opt, i) => (
                                                                        <div key={i} className="flex items-center gap-2 text-sm font-sans text-gray-800">
                                                                            <div className="w-3 h-3 border border-gray-500 rounded-full flex-shrink-0"></div>
                                                                            {isEditing ? (
                                                                                <input className="border-b border-gray-200 w-full bg-transparent text-sm font-sans" value={opt} onChange={(e) => updateOption(q.id, i, e.target.value)}/>
                                                                            ) : <span>{opt}</span>}
                                                                        </div>
                                                                    ))}
                                                                    {isEditing && <button onClick={() => addOption(q.id)} className="text-xs text-blue-600 flex items-center gap-1 print:hidden font-sans"><Plus size={12}/> گزینه</button>}
                                                                </div>
                                                            )}
                                                            {q.type === QuestionType.TRUE_FALSE && (
                                                                <div className="flex gap-6 text-sm mt-2 font-sans"><span className="flex items-center gap-1">⬜ صحیح</span><span className="flex items-center gap-1">⬜ غلط</span></div>
                                                            )}
                                                            {q.type === QuestionType.MATCHING && q.pairs && (
                                                                <div className="flex justify-between gap-8 mt-2 text-sm font-sans w-11/12 mx-auto">
                                                                    <div className="flex flex-col gap-2">{q.pairs.map((p, i) => (<div key={i} className="flex items-center gap-2"><span className="w-4 h-4 border border-gray-500 rounded-full flex items-center justify-center text-[10px]">{i + 1}</span><span>{p.right}</span></div>))}</div>
                                                                    <div className="flex flex-col gap-2">{q.pairs.map((p, i) => (<div key={i} className="flex items-center gap-2"><span className="w-4 h-4 border border-gray-500 rounded-full flex items-center justify-center text-[10px] opacity-50"></span><span>{p.left}</span></div>))}</div>
                                                                </div>
                                                            )}
                                                            {(q.type === QuestionType.SHORT_ANSWER || q.type === QuestionType.FILL_IN_THE_BLANK) && (
                                                                <div className="mt-2 border-b border-dotted border-gray-400 w-full h-6"></div>
                                                            )}
                                                            {q.type === QuestionType.LONG_ANSWER && (
                                                                <div className="mt-1 space-y-4">
                                                                    <div className="border-b border-gray-300 w-full h-6"></div>
                                                                    <div className="border-b border-gray-300 w-full h-6"></div>
                                                                    <div className="border-b border-gray-300 w-full h-6"></div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer / Evaluation Table */}
                <div className="mt-auto pt-2 border-t-2 border-gray-900 keep-together font-sans">
                     <div className="flex flex-col md:flex-row gap-3">
                        {/* Learning Objectives Table */}
                        <div className="flex-grow">
                            <h4 className="text-[10px] font-bold mb-1">جدول اهداف آموزشی و ارزشیابی توصیفی (صفحه {pageNum})</h4>
                            <table className="w-full text-[10px] border-collapse border border-gray-400">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border border-gray-400 p-1 text-center w-8">ردیف</th>
                                        <th className="border border-gray-400 p-1 text-right">هدف آموزشی / انتظار آموزشی</th>
                                        <th className="border border-gray-400 p-0 w-12 text-center font-normal whitespace-nowrap">خیلی خوب</th>
                                        <th className="border border-gray-400 p-0 w-12 text-center font-normal whitespace-nowrap">خوب</th>
                                        <th className="border border-gray-400 p-0 w-12 text-center font-normal whitespace-nowrap">قابل قبول</th>
                                        <th className="border border-gray-400 p-0 w-12 text-center font-normal whitespace-nowrap">نیاز به تلاش</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(exam.evaluationTable.length > 3 ? exam.evaluationTable.slice(0,3) : exam.evaluationTable).map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="border border-gray-400 p-1 text-center">{idx + 1}</td>
                                            <td className="border border-gray-400 p-1 truncate max-w-[200px]">{item.objective}</td>
                                            <td className="border border-gray-400"></td>
                                            <td className="border border-gray-400"></td>
                                            <td className="border border-gray-400"></td>
                                            <td className="border border-gray-400"></td>
                                        </tr>
                                    ))}
                                    {exam.evaluationTable.length === 0 && [1,2,3].map(i => (
                                        <tr key={i}>
                                            <td className="border border-gray-400 p-1 text-center">{i}</td>
                                            <td className="border border-gray-400 p-1">............................................................</td>
                                            <td className="border border-gray-400"></td>
                                            <td className="border border-gray-400"></td>
                                            <td className="border border-gray-400"></td>
                                            <td className="border border-gray-400"></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Signature Box */}
                        <div className="w-full md:w-40 flex-shrink-0 flex flex-col gap-0 text-[10px] border border-gray-400 h-auto">
                            <div className="p-1 border-b border-gray-400 flex-grow">
                                نمره با عدد: .............
                            </div>
                            <div className="p-1 border-b border-gray-400 flex-grow">
                                نمره با حروف: ............
                            </div>
                            <div className="p-1 flex-grow flex justify-between items-end">
                                <span>امضاء:</span>
                            </div>
                        </div>
                    </div>
                </div>
                </div>
            </div>
        );
      })}
    </div>
  );
};