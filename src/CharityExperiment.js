import React, { useState, useEffect } from 'react';

const getExperimentType = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('type') || 'remove';
};

const StudentSponsorshipExperiment = () => {
  const experimentType = getExperimentType();
  
  // 检测是否在iframe中
  const isInIframe = window.self !== window.top;
  
  // 学生数据 - 6个
  const studentsData = [
    { id: 1, name: "Chloe", photo: "chloe.png" },
    { id: 2, name: "Emily", photo: "emily.png" },
    { id: 3, name: "Hannah", photo: "hannah.png" },
    { id: 4, name: "Lauren", photo: "lauren.png" },
    { id: 5, name: "Megan", photo: "megan.png" },
    { id: 6, name: "Olivia", photo: "olivia.png" }
  ];

  // 状态管理
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [experimentStartTime, setExperimentStartTime] = useState(null);
  const [selectionTimes, setSelectionTimes] = useState({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [userActivityLog, setUserActivityLog] = useState([]);
  const maxSelections = 3; // 改为六选三

  // 打乱数组函数
  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // 初始化
  useEffect(() => {
    setStudents(shuffleArray(studentsData));
    setExperimentStartTime(Date.now());
  }, []);

  // 向Qualtrics父窗口发送调整大小的消息
  useEffect(() => {
    const sendResizeMessage = () => {
      try {
        // 获取主容器的实际高度
        const mainContainer = document.querySelector('.main-container');
        const height = mainContainer ? mainContainer.offsetHeight : document.body.scrollHeight;
        
        // 发送消息给父窗口
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({
            type: 'RESIZE_IFRAME',
            width: '100%',
            height: height + 20 // 只加20px的额外空间
          }, '*');
        }
      } catch (error) {
        console.log('Resize message sending failed:', error);
      }
    };

    // 初始发送
    sendResizeMessage();
    
    // 延迟发送，确保内容已渲染
    setTimeout(sendResizeMessage, 100);
    setTimeout(sendResizeMessage, 500);
    setTimeout(sendResizeMessage, 1000);
    
    // 监听窗口大小变化
    window.addEventListener('resize', sendResizeMessage);
    
    return () => window.removeEventListener('resize', sendResizeMessage);
  }, []);

  // 当内容变化时重新发送大小消息
  useEffect(() => {
    const sendResizeMessage = () => {
      try {
        const mainContainer = document.querySelector('.main-container');
        const height = mainContainer ? mainContainer.offsetHeight : document.body.scrollHeight;
        
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({
            type: 'RESIZE_IFRAME',
            width: '100%',
            height: height + 20
          }, '*');
        }
      } catch (error) {
        console.log('Resize message sending failed:', error);
      }
    };

    sendResizeMessage();
    setTimeout(sendResizeMessage, 100);
    setTimeout(sendResizeMessage, 300);
  }, [selectedStudents, isCompleted]);

  // 切换选择状态
  const toggleSelection = (studentId) => {
    const currentTime = Date.now();
    const isSelected = selectedStudents.includes(studentId);
    const studentName = students.find(student => student.id === studentId)?.name;

      
    if (isSelected) {
      // 记录取消选择
      setUserActivityLog(prev => [...prev, {
        timestamp: currentTime,
        timeFromStart: currentTime - experimentStartTime,
        action: 'deselect',
        studentId: studentId,
        studentName: studentName,
        sequenceNumber: prev.length + 1
      }]);
      setSelectedStudents(prev => prev.filter(id => id !== studentId));
      setSelectionTimes(prev => ({
        ...prev,
        [studentId]: { ...prev[studentId], deselectedAt: currentTime }
      }));
    } else {
      if (selectedStudents.length < maxSelections) {
        
        // 记录选择
        setUserActivityLog(prev => [...prev, {
          timestamp: currentTime,
          timeFromStart: currentTime - experimentStartTime,
          action: 'select',
          studentId: studentId,
          studentName: studentName,
          sequenceNumber: prev.length + 1
        }]);
  
        setSelectedStudents(prev => [...prev, studentId]);
        setSelectionTimes(prev => ({
          ...prev,
          [studentId]: { 
            selectedAt: currentTime, 
            timeFromStart: currentTime - experimentStartTime,
            selectionOrder: selectedStudents.length + 1
          }
        }));
      } else {
        alert(`You can only ${experimentType} ${maxSelections} students.`);
      }
    }
  };

  // 处理提交
  const handleSubmit = () => {
    if (selectedStudents.length === maxSelections) {
      const selectedNames = selectedStudents.map(id => 
        students.find(student => student.id === id)?.name
      ).filter(Boolean);
      
      let experimentData;
      
      if (experimentType === 'choose') {
        experimentData = {
          selectedStudentsIds: selectedStudents,
          selectedStudentsNames: selectedNames,
          totalExperimentTime: Date.now() - experimentStartTime,
          studentsOrder: students.map(student => ({ id: student.id, name: student.name })),
          experimentType: 'choose',
          userActivityLog: userActivityLog
        };
      } else {
        const remainingStudents = students.filter(student => !selectedStudents.includes(student.id));
        const remainingNames = remainingStudents.map(student => student.name);
        
        experimentData = {
          removedStudentsIds: selectedStudents,
          removedStudentsNames: selectedNames,
          remainingStudentsIds: remainingStudents.map(student => student.id),
          remainingStudentsNames: remainingNames,
          totalExperimentTime: Date.now() - experimentStartTime,
          studentsOrder: students.map(student => ({ id: student.id, name: student.name })),
          experimentType: 'remove',
          userActivityLog: userActivityLog
        };
      }

      // 发送数据到Qualtrics
      try {
        if (typeof window !== 'undefined' && window.parent && window.parent.postMessage) {
          window.parent.postMessage({
            type: 'EXPERIMENT_COMPLETE',
            data: experimentData
          }, '*');
        }
        
        if (typeof window !== 'undefined' && window.Qualtrics && window.Qualtrics.SurveyEngine) {
          window.Qualtrics.SurveyEngine.setEmbeddedData('experimentData', JSON.stringify(experimentData));
          if (experimentType === 'choose') {
            window.Qualtrics.SurveyEngine.setEmbeddedData('selectedStudents', selectedStudents.join(','));
            window.Qualtrics.SurveyEngine.setEmbeddedData('selectedStudentsNames', selectedNames.join(','));
          } else {
            const remainingStudents = students.filter(student => !selectedStudents.includes(student.id));
            const remainingNames = remainingStudents.map(student => student.name);
            window.Qualtrics.SurveyEngine.setEmbeddedData('removedStudents', selectedStudents.join(','));
            window.Qualtrics.SurveyEngine.setEmbeddedData('removedStudentsNames', selectedNames.join(','));
            window.Qualtrics.SurveyEngine.setEmbeddedData('remainingStudents', remainingStudents.map(student => student.id).join(','));
            window.Qualtrics.SurveyEngine.setEmbeddedData('remainingStudentsNames', remainingNames.join(','));
          }
        }
        
        console.log('Experiment completed:', experimentData);
        setIsCompleted(true);
        
      } catch (error) {
        console.error('Error sending data:', error);
      }
    }
  };

  // 获取要显示的学生
  const displayStudents = isCompleted 
    ? students.filter(student => selectedStudents.includes(student.id))
    : students;

  // 获取按钮文字和样式
  const getButtonConfig = (student) => {
    const isSelected = selectedStudents.includes(student.id);
    
    if (isCompleted) return null;
    
    if (isSelected) {
      return {
        text: experimentType === 'choose' ? 'SELECTED ✓' : 'REMOVED ✓',
        className: 'bg-gray-800 text-white border-2 border-gray-800'
      };
    } else {
      if (selectedStudents.length >= maxSelections) {
        return {
          text: experimentType === 'choose' ? 'CHOOSE' : 'KEEPING',
          className: 'bg-gray-300 text-gray-500 cursor-not-allowed border-2 border-gray-300',
          disabled: true
        };
      } else {
        return {
          text: experimentType === 'choose' ? 'CHOOSE' : 'REMOVE',
          className: 'bg-white text-gray-800 border-2 border-gray-400 hover:border-gray-600 hover:bg-gray-50'
        };
      }
    }
  };

  const getCardStyle = (student) => {
    const isSelected = selectedStudents.includes(student.id);
    if (isSelected) {
      return 'border-gray-800 bg-gray-50';
    }
    return 'border-gray-200 hover:border-gray-400 hover:shadow-sm';
  };

  const getHighlightText = () => {
    if (experimentType === 'choose') {
      return 'Please CHOOSE three students you would MOST like to sponsor.';
    } else {
      return 'Please REMOVE three students you would LEAST like to sponsor.';
    }
  };

  const getInstructionText = () => {
    if (experimentType === 'choose') {
      return 'Note: Before confirming, you can change your decision, click the student you previously selected and then choose again.';
    } else {
      return 'Note: Before confirming, you can change your decision, click the student you previously removed and then remove again.';
    }
  };

  const getCounterText = () => {
    if (experimentType === 'choose') {
      return `Selected: ${selectedStudents.length}/${maxSelections}`;
    } else {
      return `Removed: ${selectedStudents.length}/${maxSelections}`;
    }
  };

  const getCompletionTitle = () => {
    if (experimentType === 'choose') {
      return 'You have chosen:';
    } else {
      return 'You have removed:';
    }
  };

  return (
    <div className="bg-gray-100">
      <div className="main-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 sm:pb-28">
        
        {/* 头部和说明部分 - 只在未完成时显示 */}
        {!isCompleted && (
          <>
            {/* 主标题 */}
            <div className="bg-white border-b-4 border-gray-800 rounded-lg p-6 sm:p-8 mb-6 text-center">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-light text-gray-800 leading-tight">
                Help Six Adult Students Finish Night School
              </h1>
            </div>
            
            {/* 使命说明 */}
            <div className="bg-white rounded-lg p-6 sm:p-8 mb-6 border border-gray-200">
              <div className="text-center space-y-4 text-gray-700 max-w-5xl mx-auto">
                <p className="text-base sm:text-lg leading-relaxed font-light">
                  Six adult students are attending night classes while working day jobs. A recent tuition increase and related fees pushed costs beyond what they can afford. 
                  They ask for help. Donations will be used for tuition, allowing them to continue their studies without interruption.
                </p>
                
            
              </div>
              
              {/* 高亮指示框 */}
              <div className="bg-gray-50 border-2 border-gray-400 rounded-lg p-5 sm:p-6 text-center mt-6">
                
                <p className="text-gray-700 text-lg sm:text-xl font-medium mb-3">
                  Now you are considering sponsoring three of them.
                </p>
                <p className="text-gray-700 text-lg sm:text-xl font-medium mb-3">
                  {getHighlightText()}
                </p>
                <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                  {getInstructionText()}
                </p>
              </div>
            </div>
          </>
        )}

        {/* 完成标题 - 只在完成时显示 */}
        {isCompleted && (
          <div className="bg-white border-b-4 border-gray-800 rounded-lg p-6 sm:p-8 mb-6 text-center">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-light text-gray-800">
              {getCompletionTitle()}
            </h1>
          </div>
        )}

        {/* 学生卡片网格 - 改为3列布局 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          {displayStudents.map(student => {
            const isSelected = selectedStudents.includes(student.id);
            const buttonConfig = getButtonConfig(student);
            
            return (
              <div 
                key={student.id} 
                className={`bg-white rounded-lg border-2 transition-all duration-300 relative overflow-hidden ${getCardStyle(student)}`}
              >
                {/* 选中标签 */}
                {isSelected && (
                  <div className="absolute top-4 right-4 bg-gray-800 text-white px-3 py-1 rounded text-sm font-medium z-10">
                    ✓ {experimentType === 'choose' ? 'SELECTED' : 'REMOVED'}
                  </div>
                )}
                
                {/* 图片容器 */}
                <div className="h-56 sm:h-64 bg-gray-50 flex items-center justify-center overflow-hidden">
                  <img 
                    src={`/images/${student.photo}`} 
                    alt={student.name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = `<div class="text-gray-500 font-light text-lg">Photo of ${student.name}</div>`;
                    }}
                  />
                </div>
                
                {/* 信息区域 */}
                <div className="p-4 sm:p-5">
                  <h3 className="text-lg sm:text-xl font-light text-gray-800 text-center mb-3">
                    {student.name}
                  </h3>
                  
                  {/* 按钮 - 只在未完成时显示 */}
                  {buttonConfig && (
                    <button 
                      className={`w-full py-3 px-4 text-sm font-medium rounded transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50 ${buttonConfig.className}`}
                      onClick={() => !buttonConfig.disabled && toggleSelection(student.id)}
                      disabled={buttonConfig.disabled}
                    >
                      {buttonConfig.text}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 完成感谢信息 */}
        {isCompleted && (
          <div className="bg-white rounded-lg p-6 sm:p-8 border border-gray-200 text-center">
            <p className="text-base sm:text-lg font-light text-gray-700 leading-relaxed">
              Thanks for participating. Your response has been submitted to us. Please back to Qualtrics and complete the survey.
            </p>
          </div>
        )}

        {/* 确认按钮 - 只在未完成时显示 */}
        {!isCompleted && (
          <div className="flex justify-center mb-6">
            <button 
              className={`px-10 py-3 text-lg font-medium text-white rounded transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50 ${
                selectedStudents.length === maxSelections 
                  ? 'bg-gray-800 hover:bg-gray-900' 
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
              onClick={handleSubmit}
              disabled={selectedStudents.length !== maxSelections}
            >
              CONFIRM
            </button>
          </div>
        )}
      </div>

      {/* 固定计数器 - 只在未完成时显示 */}
      {!isCompleted && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-auto">
          <div className="bg-white border-2 border-gray-800 text-gray-800 px-5 py-2 rounded font-medium text-center text-sm sm:text-base shadow-sm">
            {getCounterText()}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentSponsorshipExperiment;
