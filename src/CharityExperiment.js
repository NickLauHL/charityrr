import React, { useState, useEffect } from 'react';

const getExperimentType = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('type') || 'remove';
};

const ChildSponsorshipExperiment = () => {
  const experimentType = getExperimentType();
  
  // 儿童数据
  const childrenData = [
    { id: 1, name: "Maine", age: 5, location: "Philippines", photo: "maine.jpg" },
    { id: 2, name: "Oleya", age: 4, location: "Philippines", photo: "oleya.jpg" },
    { id: 3, name: "Matena", age: 5, location: "Philippines", photo: "matena.jpg" },
    { id: 4, name: "Vianna", age: 4, location: "Philippines", photo: "vianna.jpg" },
    { id: 5, name: "Rhian", age: 5, location: "Philippines", photo: "rhian.jpg" },
    { id: 6, name: "Alleah", age: 4, location: "Philippines", photo: "alleah.jpg" }
  ];

  // 状态管理
  const [children, setChildren] = useState([]);
  const [selectedChildren, setSelectedChildren] = useState([]);
  const [experimentStartTime, setExperimentStartTime] = useState(null);
  const [selectionTimes, setSelectionTimes] = useState({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [userActivityLog, setUserActivityLog] = useState([]);
  const maxSelections = 3;

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
        className: 'bg-green-500 hover:bg-green-600 text-white'
      };
    } else {
      if (selectedChildren.length >= maxSelections) {
        return {
          text: experimentType === 'choose' ? 'CHOOSE' : 'KEEPING',
          className: 'bg-orange-400 text-white cursor-not-allowed opacity-70',
          disabled: true
        };
      } else {
        return {
          text: experimentType === 'choose' ? 'CHOOSE' : 'REMOVE',
          className: 'bg-orange-500 hover:bg-orange-600 hover:-translate-y-0.5 text-white'
        };
      }
    }
  };

  const getCardStyle = (child) => {
    const isSelected = selectedChildren.includes(child.id);
    if (isSelected) {
      return 'border-green-500 bg-gradient-to-br from-green-50 to-green-100';
    }
    return 'border-transparent hover:-translate-y-2';
  };

  const getHighlightText = () => {
    if (experimentType === 'choose') {
      return 'Please CHOOSE the 3 children you would most like to support.';
    } else {
      return 'Please REMOVE the 3 children you would least like to support.';
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
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        
        {/* 头部和说明部分 - 只在未完成时显示 */}
        {!isCompleted && (
          <>
            {/* 主标题 */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-xl p-6 sm:p-8 lg:p-10 mb-6 sm:mb-8 text-center">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-4">
                Meet the Children Ready for Sponsorship
              </h1>
            </div>
            
            {/* 使命说明 */}
            <div className="bg-white rounded-xl p-6 sm:p-8 mb-6 sm:mb-8 shadow-lg">
              <div className="text-center space-y-4 sm:space-y-6 text-gray-700">
                <p className="text-base sm:text-lg leading-relaxed">
                  <strong>We are dedicated child advocates on a mission to help children break free from the cycle of poverty. Through sponsorships and donations, we partner with local communities to provide love, care, and protection—so every child has the chance to learn, grow, play, and dream.</strong>
                </p>
                
                <p className="text-base sm:text-lg leading-relaxed">
                  <strong>By sponsoring a child, you help provide the love and support they need to escape poverty. Sponsored children receive essentials such as daily living supply, medical care and education.</strong>
                </p>
              </div>
              
              {/* 高亮指示框 */}
              <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 border-2 sm:border-3 border-orange-400 rounded-xl p-4 sm:p-6 text-center mt-6 sm:mt-8">
                <h3 className="text-orange-800 text-lg sm:text-xl font-bold mb-2 sm:mb-4">
                  View Photos of Children Waiting on a Sponsor
                </h3>
                <p className="text-orange-800 text-sm sm:text-base lg:text-lg font-semibold leading-relaxed">
                  Suppose your budget allows you to support only 3 children, at a cost of $50 per child.<br className="hidden sm:block" />
                  <strong>{getHighlightText()}</strong>
                </p>
              </div>
            </div>
          </>
        )}

        {/* 完成标题 - 只在完成时显示 */}
        {isCompleted && (
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl p-6 sm:p-8 mb-6 sm:mb-8 text-center">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
              {getCompletionTitle()}
            </h1>
          </div>
        )}

        {/* 儿童卡片网格 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {displayChildren.map(child => {
            const isSelected = selectedChildren.includes(child.id);
            const buttonConfig = getButtonConfig(child);
            
            return (
              <div 
                key={child.id} 
                className={`bg-white rounded-2xl shadow-lg border-2 transition-all duration-300 hover:shadow-xl relative overflow-hidden ${getCardStyle(child)}`}
              >
                {/* 选中标签 */}
                {isSelected && (
                  <div className="absolute top-3 right-3 bg-green-500 text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold z-10 shadow-lg">
                    ✓ {experimentType === 'choose' ? 'SELECTED' : 'REMOVED'}
                  </div>
                )}
                
                {/* 图片容器 */}
                <div className="h-48 sm:h-56 lg:h-64 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden">
                  <img 
                    src={`/images/${child.photo}`} 
                    alt={child.name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = `<div class="text-gray-500 font-medium">Photo of ${child.name}</div>`;
                    }}
                  />
                </div>
                
                {/* 信息区域 */}
                <div className="p-4 sm:p-6">
                  <h3 className="text-xl sm:text-2xl font-bold text-blue-800 text-center mb-3 sm:mb-4">
                    {child.name}
                  </h3>
                  
                  <div className="space-y-2 mb-4 sm:mb-6">
                    <div className="flex items-center text-gray-600">
                      <span className="text-base sm:text-lg mr-2 sm:mr-3">📍</span>
                      <span className="text-sm sm:text-base">{child.location}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <span className="text-base sm:text-lg mr-2 sm:mr-3">🎂</span>
                      <span className="text-sm sm:text-base">{child.age} years old</span>
                    </div>
                  </div>
                  
                  {/* 按钮 - 只在未完成时显示 */}
                  {buttonConfig && (
                    <button 
                      className={`w-full py-3 sm:py-4 px-4 sm:px-6 text-sm sm:text-base font-bold rounded-full transition-all duration-200 transform focus:outline-none focus:ring-4 focus:ring-opacity-50 ${buttonConfig.className}`}
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
          <div className="bg-white rounded-xl p-6 sm:p-8 shadow-lg text-center">
            <p className="text-base sm:text-lg lg:text-xl font-semibold text-gray-700 leading-relaxed">
              <strong>Thanks for participating. Your response has been submitted to us. Please back to Qualtrics and complete the survey.</strong>
            </p>
          </div>
        )}

        {/* 确认按钮 - 只在未完成时显示 */}
        {!isCompleted && (
          <div className="flex justify-center mb-6 sm:mb-8">
            <button 
              className={`px-8 sm:px-12 py-4 sm:py-5 text-lg sm:text-xl font-bold text-white rounded-full transition-all duration-300 transform focus:outline-none focus:ring-4 focus:ring-green-300 ${
                selectedChildren.length === maxSelections 
                  ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 hover:-translate-y-1 shadow-lg hover:shadow-xl' 
                  : 'bg-gray-400 cursor-not-allowed opacity-50'
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
        <div className="fixed bottom-4 left-4 right-4 sm:bottom-6 sm:left-auto sm:right-6 sm:w-auto">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-full font-bold text-center text-sm sm:text-base shadow-lg border-2 sm:border-3 border-white">
            {getCounterText()}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChildSponsorshipExperiment;