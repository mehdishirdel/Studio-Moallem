import React, { useMemo, useState, useEffect, useRef } from 'react';
import { ExamPaper, QuestionType, Question, Difficulty, ExamLabels, ExamStyle } from '../types';
import { Trash2, RefreshCw, Plus, ArrowDown, ArrowUp, Bold, Italic, Underline, AlignRight, AlignCenter, AlignLeft, Type, Minus, GripVertical } from 'lucide-react';

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

const DEFAULT_LABELS: ExamLabels = {
    school: 'نام آموزشگاه:',
    course: 'نام درس:',
    grade: 'پایه/کلاس:',
    name: 'نام و نام خانوادگی:',
    date: 'تاریخ آزمون:',
    time: 'مدت آزمون:',
    page: 'صفحه:',
    teacherFeedback: 'بازخورد معلم:',
    parentFeedback: 'بازخورد والدین:',
    signature: 'امضاء:',
};

const SECTION_TITLES: Record<QuestionType, string> = {
  [QuestionType.TRUE_FALSE]: 'سوالات صحیح و غلط',
  [QuestionType.MATCHING]: 'سوالات وصل کردنی',
  [QuestionType.MULTIPLE_CHOICE]: 'سوالات چهار گزینه‌ای',
  [QuestionType.FILL_IN_THE_BLANK]: 'جاهای خالی را با کلمات مناسب پر کنید',
  [QuestionType.SHORT_ANSWER]: 'سوالات پاسخ کوتاه',
  [QuestionType.LONG_ANSWER]: 'سوالات تشریحی',
};

// --- Helper Components ---

interface EditableProps {
    html: string;
    tagName?: string;
    className?: string;
    isEditing: boolean;
    onChange: (val: string) => void;
    placeholder?: string;
}

const Editable: React.FC<EditableProps> = ({ html, tagName = 'div', className, isEditing, onChange, placeholder }) => {
    const contentEditableRef = useRef<HTMLElement>(null);
    const [localHtml, setLocalHtml] = useState(html);

    // Sync prop changes to local state if not focused (avoids cursor jump)
    useEffect(() => {
        if (document.activeElement !== contentEditableRef.current) {
            setLocalHtml(html);
        }
    }, [html]);

    const handleBlur = () => {
        if (contentEditableRef.current) {
            // Simple cleanup of BRs if needed, but mostly just save
            let text = contentEditableRef.current.innerHTML;
            if (text === '<br>') text = '';
            onChange(text);
        }
    };

    const Tag = tagName as React.ElementType;

    if (!isEditing) {
        return <Tag className={className} dangerouslySetInnerHTML={{ __html: html || placeholder || '' }} />;
    }

    return (
        <Tag
            ref={contentEditableRef as any}
            className={`outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-50 focus:bg-blue-50 rounded px-1 transition-colors empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 ${className}`}
            contentEditable
            suppressContentEditableWarning
            onBlur={handleBlur}
            dangerouslySetInnerHTML={{ __html: localHtml }}
            data-placeholder={placeholder}
            dir="rtl"
        />
    );
};

export const ExamRenderer: React.FC<ExamRendererProps> = ({ 
    exam, 
    isEditing, 
    onUpdateExam, 
    onRegenerateQuestion,
    refProp,
    questionSpacing = 5
}) => {

  // Initialize labels/style if missing
  useEffect(() => {
    let changed = false;
    let newExam = { ...exam };

    if (!newExam.labels) {
        newExam.labels = { ...DEFAULT_LABELS };
        changed = true;
    }
    if (!newExam.style) {
        newExam.style = { fontFamily: 'Vazirmatn', fontSize: 'medium', textAlign: 'right' };
        changed = true;
    }

    if (changed) {
        onUpdateExam(newExam);
    }
  }, []);

  const labels = exam.labels || DEFAULT_LABELS;
  const style = exam.style || { fontFamily: 'Vazirmatn', fontSize: 'medium', textAlign: 'right' };

  const updateHeader = (field: string, value: string | number) => {
    onUpdateExam({
        ...exam,
        header: { ...exam.header, [field]: value }
    });
  };

  const updateLabel = (key: keyof ExamLabels, value: string) => {
      onUpdateExam({
          ...exam,
          labels: { ...labels, [key]: value }
      });
  };

  const updateStyle = (key: keyof ExamStyle, value: any) => {
      onUpdateExam({
          ...exam,
          style: { ...style, [key]: value }
      });
  };

  const increaseFontSize = () => {
    if (style.fontSize === 'small') updateStyle('fontSize', 'medium');
    else if (style.fontSize === 'medium') updateStyle('fontSize', 'large');
  };

  const decreaseFontSize = () => {
    if (style.fontSize === 'large') updateStyle('fontSize', 'medium');
    else if (style.fontSize === 'medium') updateStyle('fontSize', 'small');
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

  const maxPageWithQuestions = Math.max(0, ...Object.keys(pages).map(Number));
  const totalRenderPages = Math.max(exam.pageCount || 1, maxPageWithQuestions);
  const pageNumbers = Array.from({ length: totalRenderPages }, (_, i) => i + 1);
  
  let globalQuestionIndex = 0;

  // --- Toolbar Functions ---
  const execCmd = (cmd: string, val?: string) => {
      document.execCommand(cmd, false, val);
  };

  const preventFocusLoss = (e: React.MouseEvent) => {
      e.preventDefault();
  };

  // Helper for dynamic styles
  const getFontSizeClass = () => {
      switch(style.fontSize) {
          case 'small': return 'text-sm';
          case 'large': return 'text-lg';
          default: return 'text-base';
      }
  };
  const getFontFamilyClass = () => {
      switch(style.fontFamily) {
          case 'Sahel': return 'font-sahel';
          case 'Samim': return 'font-samim';
          case 'Tahoma': return 'font-[Tahoma]';
          case 'Arial': return 'font-[Arial]';
          default: return 'font-sans'; // Vazirmatn
      }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      
      {/* --- Word-like Toolbar --- */}
      {isEditing && (
        <div className="sticky top-20 z-30 bg-white border border-gray-300 rounded-lg shadow-lg p-2 flex flex-wrap items-center gap-2 mx-auto print:hidden animate-fade-in w-full max-w-4xl justify-center">
            <div className="flex items-center border-l border-gray-300 pl-2 gap-1">
                <select 
                    className="text-sm border rounded p-1 bg-gray-50 outline-none focus:ring-1 focus:ring-indigo-500"
                    value={style.fontFamily}
                    onChange={(e) => updateStyle('fontFamily', e.target.value)}
                >
                    <option value="Vazirmatn">وزیر متن</option>
                    <option value="Sahel">ساحل</option>
                    <option value="Samim">صمیم</option>
                    <option value="Tahoma">Tahoma</option>
                    <option value="Arial">Arial</option>
                </select>
                <div className="flex items-center bg-gray-100 rounded border border-gray-200">
                    <button 
                        onClick={decreaseFontSize} 
                        disabled={style.fontSize === 'small'}
                        className="p-1.5 rounded-r hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors" 
                        title="کوچک‌تر"
                    >
                        <Minus size={14}/>
                    </button>
                    <span className="px-2 text-xs font-bold min-w-[24px] text-center">
                        {style.fontSize === 'small' ? 'ریز' : style.fontSize === 'large' ? 'درشت' : 'عادی'}
                    </span>
                    <button 
                        onClick={increaseFontSize} 
                        disabled={style.fontSize === 'large'}
                        className="p-1.5 rounded-l hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors" 
                        title="بزرگ‌تر"
                    >
                        <Plus size={14}/>
                    </button>
                </div>
            </div>

            <div className="flex items-center border-l border-gray-300 pl-2 gap-1">
                <button onMouseDown={preventFocusLoss} onClick={() => execCmd('bold')} className="p-1.5 hover:bg-indigo-50 text-gray-700 rounded" title="Bold"><Bold size={18} /></button>
                <button onMouseDown={preventFocusLoss} onClick={() => execCmd('italic')} className="p-1.5 hover:bg-indigo-50 text-gray-700 rounded" title="Italic"><Italic size={18} /></button>
                <button onMouseDown={preventFocusLoss} onClick={() => execCmd('underline')} className="p-1.5 hover:bg-indigo-50 text-gray-700 rounded" title="Underline"><Underline size={18} /></button>
            </div>

            <div className="flex items-center gap-1">
                <button onMouseDown={preventFocusLoss} onClick={() => execCmd('justifyRight')} className="p-1.5 hover:bg-indigo-50 text-gray-700 rounded" title="Right Align"><AlignRight size={18} /></button>
                <button onMouseDown={preventFocusLoss} onClick={() => execCmd('justifyCenter')} className="p-1.5 hover:bg-indigo-50 text-gray-700 rounded" title="Center Align"><AlignCenter size={18} /></button>
                <button onMouseDown={preventFocusLoss} onClick={() => execCmd('justifyLeft')} className="p-1.5 hover:bg-indigo-50 text-gray-700 rounded" title="Left Align"><AlignLeft size={18} /></button>
            </div>
        </div>
      )}

      <div 
        className={`w-full flex flex-col items-center gap-8 overflow-x-auto exam-scroll-container print:overflow-visible print:block print:h-auto ${getFontFamilyClass()}`} 
        id="exam-wrapper"
        ref={refProp}
      >
      {pageNumbers.map((pageNum, pageIndex) => {
        const pageQuestions = pages[pageNum] || [];
        const groupedQuestions: Partial<Record<QuestionType, Question[]>> = {};
        
        pageQuestions.forEach(q => {
            if (!groupedQuestions[q.type]) groupedQuestions[q.type] = [];
            groupedQuestions[q.type]!.push(q);
        });

        return (
            <div 
                key={pageNum}
                className={`sheet ${getFontSizeClass()}`} 
            >
                <div className="flex flex-col h-full box-border relative">
                
                {/* --- Header Page 1 --- */}
                {pageNum === 1 ? (
                    <div className="mb-6 text-gray-900">
                        <div className="border-2 border-gray-800 rounded-xl p-1">
                            <div className="border border-gray-800 rounded-lg p-4 bg-white relative">
                                {/* Header Decor */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 z-10">
                                    <Editable 
                                        tagName="span" 
                                        className="font-bold text-xl text-center min-w-[100px] block" 
                                        html="بسمه تعالی" 
                                        isEditing={isEditing} 
                                        onChange={() => {}} // Static for now
                                    />
                                </div>

                                <div className="grid grid-cols-12 gap-4 pt-2">
                                    {/* Right Section */}
                                    <div className="col-span-4 flex flex-col justify-between gap-3 text-sm border-l border-gray-300 pl-4">
                                        <div className="flex items-center gap-1">
                                            <Editable className="font-bold whitespace-nowrap" html={labels.school} isEditing={isEditing} onChange={(v) => updateLabel('school', v)} />
                                            <Editable className="w-full border-b border-dotted border-gray-400" html={exam.header.schoolName} isEditing={isEditing} onChange={(v) => updateHeader('schoolName', v)} />
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Editable className="font-bold whitespace-nowrap" html={labels.course} isEditing={isEditing} onChange={(v) => updateLabel('course', v)} />
                                            <Editable className="w-full border-b border-dotted border-gray-400" html={exam.header.title} isEditing={isEditing} onChange={(v) => updateHeader('title', v)} />
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Editable className="font-bold whitespace-nowrap" html={labels.grade} isEditing={isEditing} onChange={(v) => updateLabel('grade', v)} />
                                            <Editable className="w-full border-b border-dotted border-gray-400" html={exam.header.grade} isEditing={isEditing} onChange={(v) => updateHeader('grade', v)} />
                                        </div>
                                    </div>

                                    {/* Center Section (Name Only - Redesigned) */}
                                    <div className="col-span-4 flex flex-col items-center justify-center text-sm">
                                        <div className="w-full flex flex-col items-center gap-3">
                                            <Editable className="font-bold" html={labels.name} isEditing={isEditing} onChange={(v) => updateLabel('name', v)} />
                                            <div className="w-3/4 border-b-2 border-gray-800 h-1"></div>
                                            <div className="w-full border-b border-dotted border-gray-400 h-6"></div>
                                        </div>
                                    </div>

                                    {/* Left Section */}
                                    <div className="col-span-4 flex flex-col justify-between gap-3 text-sm border-r border-gray-300 pr-4">
                                        <div className="flex items-center gap-2">
                                            <Editable className="font-bold whitespace-nowrap" html={labels.date} isEditing={isEditing} onChange={(v) => updateLabel('date', v)} />
                                            <span className="font-medium font-mono" dir="ltr">14__/___/___</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Editable className="font-bold whitespace-nowrap" html={labels.time} isEditing={isEditing} onChange={(v) => updateLabel('time', v)} />
                                            <div className="flex items-center gap-1">
                                                <Editable 
                                                    html={exam.header.durationMinutes.toString()} 
                                                    isEditing={isEditing} 
                                                    onChange={(v) => updateHeader('durationMinutes', v)}
                                                    className="w-12 text-center border-b border-dotted border-gray-400"
                                                />
                                                <span className="text-xs">دقیقه</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Editable className="font-bold whitespace-nowrap" html={labels.page} isEditing={isEditing} onChange={(v) => updateLabel('page', v)} />
                                            <span className="font-medium">{totalRenderPages} صفحه</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                   // Minimal Header
                   <div className="border-b-2 border-gray-800 pb-2 mb-6 flex justify-between items-center text-xs text-gray-600 keep-together">
                       <span className="font-bold text-gray-800 flex gap-2">
                           {exam.header.title} - <Editable html={`${labels.page} ${pageNum} از ${totalRenderPages}`} isEditing={isEditing} onChange={() => {}}/>
                       </span>
                       <span className="flex gap-1">
                           <Editable html={labels.name} isEditing={isEditing} onChange={(v) => updateLabel('name', v)}/>
                           ................................
                       </span>
                   </div>
                )}
                
                {/* Page Content */}
                <div className="flex-grow space-y-4">
                    {pageQuestions.length === 0 && (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 border-2 border-dashed border-gray-200 rounded-lg">
                            {isEditing ? "صفحه خالی (سوالات را اینجا منتقل کنید)" : ""}
                        </div>
                    )}

                    {TYPE_ORDER.map((type) => {
                        const questions = groupedQuestions[type];
                        if (!questions || questions.length === 0) return null;

                        return (
                            <div key={type} className="border border-gray-400 rounded-lg overflow-hidden keep-together">
                                {/* Section Header */}
                                <div className="bg-gray-100 px-3 py-1 border-b border-gray-400 text-sm font-bold text-gray-800 flex justify-between items-center keep-together">
                                    <span className="flex items-center gap-2 w-full">
                                        <span className="w-2 h-2 bg-gray-800 rounded-sm"></span>
                                        <Editable 
                                            html={SECTION_TITLES[type]} 
                                            isEditing={isEditing} 
                                            onChange={(val) => {}}
                                            className="w-full"
                                        />
                                    </span>
                                </div>

                                <div 
                                    className="p-3 flex flex-col" 
                                    style={{ gap: `${questionSpacing * 0.25}rem` }}
                                >
                                    {questions.map((q) => {
                                        globalQuestionIndex++;
                                        return (
                                            <div key={q.id} className="relative group keep-together hover:bg-gray-50 rounded-lg p-2 -mx-2 transition-colors">
                                                {/* Editing Controls */}
                                                {isEditing && (
                                                    <div className="absolute -right-12 top-0 flex flex-col gap-1 print:hidden opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                        <div className="p-1 bg-gray-200 rounded cursor-move" title="Drag"><GripVertical size={14}/></div>
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
                                                            <div className="absolute right-full top-0 hidden group-hover/diff:flex bg-white shadow-lg border rounded ml-1 z-10 w-24 flex-col">
                                                                <button onClick={() => onRegenerateQuestion(q.id, 'Easy')} className="px-2 py-1 text-xs hover:bg-gray-100 text-right">آسان</button>
                                                                <button onClick={() => onRegenerateQuestion(q.id, 'Medium')} className="px-2 py-1 text-xs hover:bg-gray-100 text-right">متوسط</button>
                                                                <button onClick={() => onRegenerateQuestion(q.id, 'Hard')} className="px-2 py-1 text-xs hover:bg-gray-100 text-right">دشوار</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex items-start gap-2">
                                                    <div className="flex flex-col items-center gap-1 pt-1">
                                                        <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-black text-white rounded-full text-[10px] font-bold">
                                                            {globalQuestionIndex}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="flex-grow mr-1 w-full">
                                                        <div className="flex justify-between items-start gap-2 w-full">
                                                            <Editable 
                                                                html={q.text} 
                                                                isEditing={isEditing} 
                                                                onChange={(val) => updateQuestion(q.id, 'text', val)}
                                                                className="w-full text-justify leading-relaxed"
                                                            />
                                                            <div className="w-10 h-6 border border-gray-600 bg-white rounded-[2px] flex-shrink-0 mt-1"></div>
                                                        </div>
                                                        
                                                        {/* Options Render */}
                                                        <div className="mt-1 pr-1">
                                                            {q.type === QuestionType.MULTIPLE_CHOICE && q.options && (
                                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 mt-2" dir="rtl">
                                                                    {q.options.map((opt, i) => (
                                                                        <div key={i} className="flex items-center gap-2 text-sm text-gray-800">
                                                                            <div className="w-3 h-3 border border-gray-500 rounded-full flex-shrink-0"></div>
                                                                            <Editable 
                                                                                html={opt} 
                                                                                isEditing={isEditing} 
                                                                                onChange={(val) => updateOption(q.id, i, val)}
                                                                                className="w-full"
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                    {isEditing && <button onClick={() => addOption(q.id)} className="text-xs text-blue-600 flex items-center gap-1 print:hidden"><Plus size={12}/> گزینه</button>}
                                                                </div>
                                                            )}
                                                            {q.type === QuestionType.TRUE_FALSE && (
                                                                <div className="flex gap-6 text-sm mt-2" dir="rtl"><span className="flex items-center gap-1">⬜ صحیح</span><span className="flex items-center gap-1">⬜ غلط</span></div>
                                                            )}
                                                            {q.type === QuestionType.MATCHING && q.pairs && (
                                                                <div className="flex justify-between gap-8 mt-2 text-sm w-11/12 mx-auto" dir="rtl">
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

                {/* Footer / Feedback Table */}
                <div className="mt-auto pt-2 border-t-2 border-gray-900 keep-together">
                     <div className="flex flex-col md:flex-row gap-3">
                        {/* Learning Objectives Table */}
                        <div className="flex-grow">
                            <h4 className="text-[10px] font-bold mb-1 flex gap-1">جدول اهداف آموزشی و ارزشیابی توصیفی <span className="font-normal">(صفحه {pageNum})</span></h4>
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
                                            <td className="border border-gray-400 p-1 max-w-[200px]">
                                                <Editable html={item.objective} isEditing={isEditing} onChange={()=>{}} className="w-full"/>
                                            </td>
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

                        {/* Feedback Boxes - REPLACED Numeric Scores */}
                        <div className="w-full md:w-48 flex-shrink-0 flex flex-col gap-2 h-auto">
                            <div className="border border-gray-400 p-1 rounded h-16 flex flex-col">
                                <div className="text-[10px] font-bold mb-1 border-b border-gray-300 pb-1">
                                    <Editable html={labels.teacherFeedback} isEditing={isEditing} onChange={(v) => updateLabel('teacherFeedback', v)}/>
                                </div>
                                <div className="flex-grow"></div>
                            </div>
                            <div className="border border-gray-400 p-1 rounded h-16 flex flex-col">
                                <div className="text-[10px] font-bold mb-1 border-b border-gray-300 pb-1">
                                    <Editable html={labels.parentFeedback} isEditing={isEditing} onChange={(v) => updateLabel('parentFeedback', v)}/>
                                </div>
                                <div className="flex-grow"></div>
                            </div>
                             <div className="flex justify-between items-center text-[10px] px-1">
                                 <Editable className="font-bold" html={labels.signature} isEditing={isEditing} onChange={(v) => updateLabel('signature', v)}/>
                             </div>
                        </div>
                    </div>
                </div>
                </div>
            </div>
        );
      })}
    </div>
    </div>
  );
};