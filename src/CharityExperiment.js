import React, { useState, useEffect } from 'react';

const getExperimentType = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('type') || 'remove';
};

const ChildSponsorshipExperiment = () => {
  const experimentType = getExperimentType();
  
  // 儿童数据 - 2个
  const childrenData = [
    { id: 1, name: "Maine", photo: "maine.jpg" },
    { id: 2, name: "Oleya", photo: "oleya.jpg" }
  ];

  // 状态管理
  const [children, setChildren] = useState([]);
  const [selectedChildren, setSelectedChildren] = useState([]);
  const [experimentStartTime, setExperimentStartTime] = useState(null);
  const [selectionTimes, setSelectionTimes] = useState({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [userActivityLog, setUserActivityLog] = useState([]);
  const maxSelections = 1;

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
    setChildren(shuffleArray(childrenData));
    setExperimentStartTime(Date.now());
  }, []);

  // 切换选择状态
  const toggleSelection = (childId) => {
    const currentTime = Date.now();
    const isSelected = selectedChildren.includes(childId);
    const childName = children.find(child => child.id === childId)?.name;

      
    if (isSelected) {
      // 记录取消选择
  setUserActivityLog(prev => [...prev, {
    timestamp: currentTime,
    timeFromStart: currentTime - experimentStartTime,
    action: 'deselect',
    childId: childId,
    childName: childName,
    sequenceNumber: prev.length + 1
  }]);
      setSelectedChildren(prev => prev.filter(id => id !== childId));
      setSelectionTimes(prev => ({
        ...prev,
        [childId]: { ...prev[childId], deselectedAt: currentTime }
      }));
    } else {
      if (selectedChildren.length < maxSelections) {
        
         // 记录选择
  setUserActivityLog(prev => [...prev, {
    timestamp: currentTime,
    timeFromStart: currentTime - experimentStartTime,
    action: 'select',
    childId: childId,
    childName: childName,
    sequenceNumber: prev.length + 1
  }]);
  
        setSelectedChildren(prev => [...prev, childId]);
        setSelectionTimes(prev => ({
          ...prev,
          [childId]: { 
            selectedAt: currentTime, 
            timeFromStart: currentTime - experimentStartTime,
            selectionOrder: selectedChildren.length + 1
          }
        }));
      } else {
        alert(`You can only ${experimentType} ${maxSelections} children.`);
      }
    }
  };

  // 处理提交
  const handleSubmit = () => {
    if (selectedChildren.length === maxSelections) {
      const selectedNames = selectedChildren.map(id => 
        children.find(child => child.id === id)?.name
      ).filter(Boolean);
      
      let experimentData;
      
      if (experimentType === 'choose') {
        experimentData = {
          selectedChildrenIds: selectedChildren,
          selectedChildrenNames: selectedNames,
          selectionOrder: selectedChildren.map(id => ({
            childId: id,
            childName: children.find(child => child.id === id)?.name,
            selectionOrder: selectionTimes[id]?.selectionOrder,
            timeFromStart: selectionTimes[id]?.timeFromStart
          })),
          totalExperimentTime: Date.now() - experimentStartTime,
          childrenOrder: children.map(child => ({ id: child.id, name: child.name })),
          experimentType: 'choose',
          timestamp: new Date().toISOString(),
          userActivityLog: userActivityLog
        };
      } else {
        const remainingChildren = children.filter(child => !selectedChildren.includes(child.id));
        const remainingNames = remainingChildren.map(child => child.name);
        
        experimentData = {
          removedChildrenIds: selectedChildren,
          removedChildrenNames: selectedNames,
          remainingChildrenIds: remainingChildren.map(child => child.id),
          remainingChildrenNames: remainingNames,
          removalOrder: selectedChildren.map(id => ({
            childId: id,
            childName: children.find(child => child.id === id)?.name,
            removalOrder: selectionTimes[id]?.selectionOrder,
            timeFromStart: selectionTimes[id]?.timeFromStart
          })),
          totalExperimentTime: Date.now() - experimentStartTime,
          childrenOrder: children.map(child => ({ id: child.id, name: child.name })),
          experimentType: 'remove',
          timestamp: new Date().toISOString(),
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
            window.Qualtrics.SurveyEngine.setEmbeddedData('selectedChildren', selectedChildren.join(','));
            window.Qualtrics.SurveyEngine.setEmbeddedData('selectedChildrenNames', selectedNames.join(','));
          } else {
            const remainingChildren = children.filter(child => !selectedChildren.includes(child.id));
            const remainingNames = remainingChildren.map(child => child.name);
            window.Qualtrics.SurveyEngine.setEmbeddedData('removedChildren', selectedChildren.join(','));
            window.Qualtrics.SurveyEngine.setEmbeddedData('removedChildrenNames', selectedNames.join(','));
            window.Qualtrics.SurveyEngine.setEmbeddedData('remainingChildren', remainingChildren.map(child => child.id).join(','));
            window.Qualtrics.SurveyEngine.setEmbeddedData('remainingChildrenNames', remainingNames.join(','));
          }
        }
        
        console.log('Experiment completed:', experimentData);
        setIsCompleted(true);
        
      } catch (error) {
        console.error('Error sending data:', error);
      }
    }
  };

  // 获取要显示的儿童
  const displayChildren = isCompleted 
    ? children.filter(child => selectedChildren.includes(child.id))
    : children;

  // 获取按钮文字和样式
  const getButtonConfig = (child) => {
    const isSelected = selectedChildren.includes(child.id);
    
    if (isCompleted) return null;
    
    if (isSelected) {
      return {
        text: experimentType === 'choose' ? 'SELECTED ✓' : 'REMOVED ✓',
        className: 'bg-gray-800 text-white border-2 border-gray-800'
      };
    } else {
      if (selectedChildren.length >= maxSelections) {
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

  const getCardStyle = (child) => {
    const isSelected = selectedChildren.includes(child.id);
    if (isSelected) {
      return 'border-gray-800 bg-gray-50';
    }
    return 'border-gray-200 hover:border-gray-400 hover:shadow-sm';
  };

  const getHighlightText = () => {
    if (experimentType === 'choose') {
      return 'Please CHOOSE the child you would like to sponsor.';
    } else {
      return 'Please REMOVE the child you would not like to sponsor.';
    }
  };

  const getInstructionText = () => {
    if (experimentType === 'choose') {
      return 'Note: Before confirming, you can change your decision, click the child you previously selected and then choose again.';
    } else {
      return 'Note: Before confirming, you can change your decision, click the child you previously removed and then remove again.';
    }
  };

  const getCounterText = () => {
    if (experimentType === 'choose') {
      return `Selected: ${selectedChildren.length}/${maxSelections}`;
    } else {
      return `Removed: ${selectedChildren.length}/${maxSelections}`;
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
    <div className="min-h-screen bg-gray-100 pb-20 sm:pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        
        {/* 头部和说明部分 - 只在未完成时显示 */}
        {!isCompleted && (
          <>
            {/* 主标题 */}
            <div className="bg-white border-b-4 border-gray-800 rounded-lg p-8 sm:p-12 mb-8 text-center">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-gray-800 leading-tight">
                Sponsor a Child
              </h1>
            </div>
            
            {/* 使命说明 */}
            <div className="bg-white rounded-lg p-8 sm:p-10 mb-8 border border-gray-200">
              <div className="text-center space-y-6 text-gray-700 max-w-4xl mx-auto">
                <p className="text-lg sm:text-xl leading-relaxed font-light">
                  Sponsorship is one of the most powerful ways you can make a difference in a child’s life. 
                </p>
                
                <p className="text-lg sm:text-xl leading-relaxed font-light">
                  When you sponsor a child, you connect directly with a child facing tough circumstances and help them grow up healthy, educated and safe.
                </p>
              </div>
              
              {/* 高亮指示框 */}
              <div className="bg-gray-50 border-2 border-gray-400 rounded-lg p-6 sm:p-8 text-center mt-8">
                <h3 className="text-gray-700 text-xl sm:text-2xl font-medium mb-4">
                  Maine and Oleya are Waiting for a Sponsor
                </h3>
                <p className="text-gray-700 text-xl sm:text-2xl font-medium mb-4">
                  Now you are considering sponsoring one of them.
                </p>
                <p className="text-gray-700 text-xl sm:text-2xl font-medium mb-4">
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
          <div className="bg-white border-b-4 border-gray-800 rounded-lg p-8 sm:p-10 mb-8 text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-gray-800">
              {getCompletionTitle()}
            </h1>
          </div>
        )}

        {/* 儿童卡片网格 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-10 mb-10">
          {displayChildren.map(child => {
            const isSelected = selectedChildren.includes(child.id);
            const buttonConfig = getButtonConfig(child);
            
            return (
              <div 
                key={child.id} 
                className={`bg-white rounded-lg border-2 transition-all duration-300 relative overflow-hidden ${getCardStyle(child)}`}
              >
                {/* 选中标签 */}
                {isSelected && (
                  <div className="absolute top-4 right-4 bg-gray-800 text-white px-3 py-1 rounded text-sm font-medium z-10">
                    ✓ {experimentType === 'choose' ? 'SELECTED' : 'REMOVED'}
                  </div>
                )}
                
                {/* 图片容器 */}
                <div className="h-80 sm:h-96 bg-gray-50 flex items-center justify-center overflow-hidden">
                  <img 
                    src={`/images/${child.photo}`} 
                    alt={child.name}
                    className="w-full h-full object-contain grayscale"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = `<div class="text-gray-500 font-light text-lg">Photo of ${child.name}</div>`;
                    }}
                  />
                </div>
                
                {/* 信息区域 */}
                <div className="p-6 sm:p-8">
                  <h3 className="text-2xl sm:text-3xl font-light text-gray-800 text-center mb-6">
                    {child.name}
                  </h3>
                  
                  {/* 按钮 - 只在未完成时显示 */}
                  {buttonConfig && (
                    <button 
                      className={`w-full py-4 px-6 text-base font-medium rounded transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50 ${buttonConfig.className}`}
                      onClick={() => !buttonConfig.disabled && toggleSelection(child.id)}
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
          <div className="bg-white rounded-lg p-8 sm:p-10 border border-gray-200 text-center">
            <p className="text-lg sm:text-xl font-light text-gray-700 leading-relaxed">
              Thanks for participating. Your response has been submitted to us. Please back to Qualtrics and complete the survey.
            </p>
          </div>
        )}

        {/* 确认按钮 - 只在未完成时显示 */}
        {!isCompleted && (
          <div className="flex justify-center mb-8">
            <button 
              className={`px-12 py-4 text-xl font-medium text-white rounded transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50 ${
                selectedChildren.length === maxSelections 
                  ? 'bg-gray-800 hover:bg-gray-900' 
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
              onClick={handleSubmit}
              disabled={selectedChildren.length !== maxSelections}
            >
              CONFIRM
            </button>
          </div>
        )}
      </div>

      {/* 固定计数器 - 只在未完成时显示 */}
      {!isCompleted && (
        <div className="fixed bottom-6 left-6 right-6 sm:left-auto sm:right-6 sm:w-auto">
          <div className="bg-white border-2 border-gray-800 text-gray-800 px-6 py-3 rounded font-medium text-center text-base shadow-sm">
            {getCounterText()}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChildSponsorshipExperiment;