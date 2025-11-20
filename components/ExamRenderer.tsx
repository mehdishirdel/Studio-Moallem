import React from 'react';
import { ExamPaper, QuestionType, Question, Difficulty } from '../types';
import { Trash2, RefreshCw, Plus, X } from 'lucide-react';

interface ExamRendererProps {
  exam: ExamPaper;
  isEditing: boolean;
  onUpdateExam: (exam: ExamPaper) => void;
  onRegenerateQuestion: (qId: number, newDifficulty: Difficulty) => void;
  refProp?: React.Ref<HTMLDivElement>;
}

export const ExamRenderer: React.FC<ExamRendererProps> = ({ 
    exam, 
    isEditing, 
    onUpdateExam, 
    onRegenerateQuestion,
    refProp 
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

  return (
    <div className="w-full flex justify-center bg-gray-200 p-4 md:p-8 overflow-auto print:p-0 print:bg-white">
      {/* A4 Container - 210mm width */}
      <div 
        ref={refProp} 
        className="bg-white shadow-2xl mx-auto print:shadow-none print:mx-0 relative"
        style={{ 
            width: '210mm', 
            minHeight: '297mm',
            padding: '15mm 15mm 15mm 15mm',
            boxSizing: 'border-box'
        }} 
        id="exam-paper"
      >
        
        {/* Header Box */}
        <div className="border-2 border-gray-900 rounded-lg mb-6 p-3">
             <div className="grid grid-cols-3 gap-4 text-sm font-bold leading-8">
                <div className="space-y-1">
                    <div className="flex gap-1">
                        <span>نام آموزشگاه:</span>
                        {isEditing ? (
                            <input 
                                className="border-b border-gray-400 px-1 w-24 focus:outline-none" 
                                value={exam.header.schoolName}
                                onChange={(e) => updateHeader('schoolName', e.target.value)}
                            />
                        ) : (
                            <span>{exam.header.schoolName || '................'}</span>
                        )}
                    </div>
                    <div className="flex gap-1">
                        <span>نام درس:</span>
                        {isEditing ? (
                            <input 
                                className="border-b border-gray-400 px-1 w-24 focus:outline-none" 
                                value={exam.header.title}
                                onChange={(e) => updateHeader('title', e.target.value)}
                            />
                        ) : (
                            <span>{exam.header.title}</span>
                        )}
                    </div>
                </div>

                <div className="space-y-1 text-center">
                     <div className="flex justify-center gap-1">
                        <span>نام و نام خانوادگی:</span>
                        <span>........................</span>
                    </div>
                    <div className="flex justify-center gap-1">
                        <span>پایه/کلاس:</span>
                        {isEditing ? (
                            <input 
                                className="border-b border-gray-400 px-1 w-16 focus:outline-none text-center" 
                                value={exam.header.grade}
                                onChange={(e) => updateHeader('grade', e.target.value)}
                            />
                        ) : (
                            <span>{exam.header.grade || '........'}</span>
                        )}
                    </div>
                </div>

                <div className="space-y-1 text-left dir-ltr flex flex-col items-end">
                    <div className="flex gap-1 dir-rtl">
                        <span>تاریخ:</span>
                        <span>..../..../....</span>
                    </div>
                    <div className="flex gap-1 dir-rtl">
                        <span>زمان:</span>
                         {isEditing ? (
                            <input 
                                className="border-b border-gray-400 px-1 w-8 focus:outline-none text-center" 
                                value={exam.header.durationMinutes}
                                onChange={(e) => updateHeader('durationMinutes', e.target.value)}
                            />
                        ) : (
                            <span>{exam.header.durationMinutes}</span>
                        )}
                        <span>دقیقه</span>
                    </div>
                     <div className="flex gap-1 dir-rtl">
                        <span>نمره کل:</span>
                        {isEditing ? (
                            <input 
                                className="border-b border-gray-400 px-1 w-8 focus:outline-none text-center" 
                                value={exam.header.totalScore}
                                onChange={(e) => updateHeader('totalScore', e.target.value)}
                            />
                        ) : (
                            <span>{exam.header.totalScore}</span>
                        )}
                    </div>
                </div>
             </div>
        </div>

        {/* Questions List */}
        <div className="space-y-6">
          {exam.questions.map((q, index) => (
            <div key={q.id} className="relative group break-inside-avoid">
              
              {/* Editing Controls */}
              {isEditing && (
                  <div className="absolute -right-10 top-0 flex flex-col gap-1 print:hidden opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => deleteQuestion(q.id)}
                        className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200" 
                        title="حذف سوال"
                      >
                          <Trash2 size={14} />
                      </button>
                      <div className="relative group/diff">
                        <button className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200" title="تغییر سطح و بازنویسی">
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
                
                {/* Question Number & Score Box */}
                <div className="flex flex-col items-center gap-1">
                   <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-gray-800 text-white rounded text-xs font-bold mt-1">
                    {index + 1}
                  </span>
                  {/* Empty Score Box for Teacher */}
                  <div className="w-8 h-8 border border-gray-800 bg-white rounded-sm mt-1" title="محل درج نمره"></div>
                </div>
                
                
                <div className="flex-grow mr-2">
                  <div className="flex justify-between items-start gap-2">
                      {isEditing ? (
                          <textarea 
                             className="w-full p-1 border border-gray-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm bg-gray-50 min-h-[2.5rem]"
                             value={q.text}
                             onChange={(e) => updateQuestion(q.id, 'text', e.target.value)}
                             rows={2}
                          />
                      ) : (
                          <h3 className="font-medium text-base mb-1 text-justify leading-7">{q.text}</h3>
                      )}
                  </div>
                  
                  {/* Options & Answers Area */}
                  <div className="mt-1 pr-1">
                      {q.type === QuestionType.MULTIPLE_CHOICE && q.options && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 mt-2">
                          {q.options.map((opt, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <div className="w-3 h-3 border border-gray-500 rounded-full"></div>
                              {isEditing ? (
                                <input 
                                    className="border-b border-gray-200 w-full bg-transparent text-sm"
                                    value={opt}
                                    onChange={(e) => updateOption(q.id, i, e.target.value)}
                                />
                              ) : (
                                <span>{opt}</span>
                              )}
                            </div>
                          ))}
                          {isEditing && (
                              <button onClick={() => addOption(q.id)} className="text-xs text-blue-600 flex items-center gap-1 print:hidden">
                                  <Plus size={12}/> گزینه
                              </button>
                          )}
                        </div>
                      )}

                      {q.type === QuestionType.TRUE_FALSE && (
                        <div className="flex gap-6 text-sm mt-2">
                            <span className="flex items-center gap-1">⬜ صحیح</span>
                            <span className="flex items-center gap-1">⬜ غلط</span>
                        </div>
                      )}

                      {q.type === QuestionType.MATCHING && q.pairs && (
                          <div className="flex justify-between gap-8 mt-2 text-sm w-3/4 mx-auto">
                              <div className="flex flex-col gap-3">
                                  {q.pairs.map((p, i) => (
                                      <div key={i} className="flex items-center gap-2">
                                          <span className="w-5 h-5 border rounded-full flex items-center justify-center text-[10px]">{i + 1}</span>
                                          <span>{p.right}</span>
                                      </div>
                                  ))}
                              </div>
                              <div className="flex flex-col gap-3">
                                  {q.pairs.map((p, i) => (
                                      <div key={i} className="flex items-center gap-2">
                                          <span className="w-5 h-5 border rounded-full flex items-center justify-center text-[10px] opacity-50"></span>
                                          <span>{p.left}</span>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}

                      {(q.type === QuestionType.SHORT_ANSWER || q.type === QuestionType.FILL_IN_THE_BLANK) && (
                          <div className="mt-3 border-b border-dotted border-gray-400 w-full h-6"></div>
                      )}

                      {q.type === QuestionType.LONG_ANSWER && (
                          <div className="mt-2 space-y-3">
                              <div className="border-b border-gray-300 w-full h-6"></div>
                              <div className="border-b border-gray-300 w-full h-6"></div>
                              <div className="border-b border-gray-300 w-full h-6"></div>
                              {isEditing && <div className="text-xs text-gray-400 print:hidden">فاصله تشریحی</div>}
                          </div>
                      )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Compact Evaluation Table (Bottom of page) */}
        <div className="mt-8 pt-4 border-t-2 border-gray-900 break-inside-avoid">
            <div className="flex flex-col md:flex-row gap-4">
                
                {/* Learning Objectives Table */}
                <div className="flex-grow">
                    <h4 className="text-xs font-bold mb-1">جدول اهداف آموزشی و ارزشیابی توصیفی</h4>
                    <table className="w-full text-xs border-collapse border border-gray-400">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-gray-400 p-1 text-center w-10">ردیف</th>
                                <th className="border border-gray-400 p-1 text-right">هدف آموزشی / انتظار آموزشی</th>
                                <th className="border border-gray-400 p-1 w-16 text-center rotate-text">خیلی خوب</th>
                                <th className="border border-gray-400 p-1 w-16 text-center rotate-text">خوب</th>
                                <th className="border border-gray-400 p-1 w-16 text-center rotate-text">قابل قبول</th>
                                <th className="border border-gray-400 p-1 w-16 text-center rotate-text">نیاز به تلاش</th>
                            </tr>
                        </thead>
                        <tbody>
                            {exam.evaluationTable && exam.evaluationTable.length > 0 ? (
                                exam.evaluationTable.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="border border-gray-400 p-1 text-center">{idx + 1}</td>
                                        <td className="border border-gray-400 p-1">{item.objective}</td>
                                        <td className="border border-gray-400"></td>
                                        <td className="border border-gray-400"></td>
                                        <td className="border border-gray-400"></td>
                                        <td className="border border-gray-400"></td>
                                    </tr>
                                ))
                            ) : (
                                [1,2,3,4].map(i => (
                                    <tr key={i}>
                                        <td className="border border-gray-400 p-1 text-center">{i}</td>
                                        <td className="border border-gray-400 p-1">............................................................</td>
                                        <td className="border border-gray-400"></td>
                                        <td className="border border-gray-400"></td>
                                        <td className="border border-gray-400"></td>
                                        <td className="border border-gray-400"></td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Grade Box */}
                <div className="w-full md:w-48 flex-shrink-0 flex flex-col gap-0 text-xs border border-gray-400">
                    <div className="p-2 border-b border-gray-400 h-1/3">
                        نمره با عدد: ......................
                    </div>
                    <div className="p-2 border-b border-gray-400 h-1/3">
                        نمره با حروف: ......................
                    </div>
                    <div className="p-2 h-1/3 flex justify-between items-end">
                        <span>امضاء و تاریخ:</span>
                    </div>
                </div>
            </div>
            <div className="text-center text-[10px] mt-2 text-gray-500">
                طراحی شده با آزمون‌ساز هوشمند
            </div>
        </div>
      </div>
    </div>
  );
};