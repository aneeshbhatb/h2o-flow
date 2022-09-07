/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { defer, map, isString, head } = require('lodash');

const { stringify } = require('../../core/modules/prelude');
const { react, lift, link, signal, signals } = require("../../core/modules/dataflow");
const util = require('../../core/modules/util');
const FlowError = require('../../core/modules/flow-error');

module.exports = function(_, _go, opt) {
  const _destinationKey = signal(opt.predictions_frame != null ? opt.predictions_frame : `prediction-${util.uuid()}`);

  const _selectedModels = opt.models ?
    opt.models
  :
    opt.model ?
      [ opt.model ]
    :
      [];

  const _selectedFrames = opt.frames ?
    opt.frames
  :
    opt.frame ?
      [ opt.frame ]
    :
      [];

  const _selectedModelsCaption = _selectedModels.join(', ');
  const _selectedFramesCaption = _selectedFrames.join(', ');
  const _exception = signal(null);
  const _selectedFrame = signal(null);
  const _selectedModel = signal(null);
  const _hasFrames = _selectedFrames.length ? true : false;
  const _hasModels = _selectedModels.length ? true : false;

  const _frames = signals([]);
  const _models = signals([]);
  const _isDeepLearning = lift(_selectedModel, model => model && (model.algo === 'deeplearning'));
  const _hasReconError = lift(_selectedModel, function(model) {
    if (model) {
      if (model.algo === 'deeplearning') {
        for (let parameter of Array.from(model.parameters)) {
          if ((parameter.name === 'autoencoder') && (parameter.actual_value === true)) {
            return true;
          }
        }
      }
    }
    return false;
  });

  const _hasLeafNodeAssignment = lift(_selectedModel, function(model) {
    if (model) {
      switch (model.algo) {
        case 'gbm': case 'drf':
          return true;
        default:
          return false;
      }
    }
  });

  const _hasExemplarIndex = lift(_selectedModel, function(model) {
    if (model) {
      switch (model.algo) {
        case 'aggregator':
          return true;
        default:
          return false;
      }
    }
  });

  const _computeReconstructionError = signal(false);
  const _computeDeepFeaturesHiddenLayer = signal(false);
  const _computeLeafNodeAssignment = signal(false);
  const _deepFeaturesHiddenLayer = signal(0);
  const _deepFeaturesHiddenLayerValue = lift(_deepFeaturesHiddenLayer, text => parseInt(text, 10));
  const _exemplarIndex = signal(0);
  const _exemplarIndexValue = lift(_exemplarIndex, text => parseInt(text, 10));
  const _canPredict = lift(_selectedFrame, _selectedModel, _hasReconError, _computeReconstructionError, _computeDeepFeaturesHiddenLayer, _deepFeaturesHiddenLayerValue, _exemplarIndexValue, _hasExemplarIndex, function(frame, model, hasReconError, computeReconstructionError, computeDeepFeaturesHiddenLayer, deepFeaturesHiddenLayerValue, exemplarIndexValue, hasExemplarIndex) {
    const hasFrameAndModel = (frame && model) || (_hasFrames && model) || (_hasModels && frame) || (_hasModels && hasExemplarIndex);
    const hasValidOptions = hasReconError ?
      computeReconstructionError ?
        true
      : computeDeepFeaturesHiddenLayer ?
        !isNaN(deepFeaturesHiddenLayerValue)
      :
        true
    :
      true;

    return hasFrameAndModel && hasValidOptions;
  });

  if (!_hasFrames) {
    _.requestFrames(function(error, frames) {
      if (error) {
        return _exception(new FlowError('Error fetching frame list.', error));
      } else {
        return _frames((Array.from(frames).filter((frame) => !frame.is_text).map((frame) => frame.frame_id.name)));
      }
    });
  }

  if (!_hasModels) {
    _.requestModels(function(error, models) {
      if (error) {
        return _exception(new FlowError('Error fetching model list.', error));
      } else {
        //TODO use models directly
        return _models((Array.from(models).map((model) => model.model_id.name)));
      }
    });
  }

  if (!_selectedModel()) {
    if (opt.model && isString(opt.model)) {
      _.requestModel(opt.model, (error, model) => _selectedModel(model));
    }
  }

  const predict = function() {
    let frameArg, modelArg;
    if (_hasFrames) {
      frameArg = _selectedFrames.length > 1 ? _selectedFrames : head(_selectedFrames);
      modelArg = _selectedModel();
    } else if (_hasModels) {
      modelArg = _selectedModels.length > 1 ? _selectedModels : head(_selectedModels);
      frameArg = _selectedFrame();
    } else {
      modelArg = _selectedModel();
      frameArg = _selectedFrame();
    }

    const destinationKey = _destinationKey();
    let cs = `predict model: ${stringify(modelArg)}, frame: ${stringify(frameArg)}`;
    if (destinationKey) {
      cs += `, predictions_frame: ${stringify(destinationKey)}`;
    }

    if (_hasReconError()) {
      if (_computeReconstructionError()) {
        cs += ', reconstruction_error: true';
      }
    }

    if (_computeDeepFeaturesHiddenLayer()) {
      cs += `, deep_features_hidden_layer: ${_deepFeaturesHiddenLayerValue()}`;
    }

    if (_hasLeafNodeAssignment()) {
      if (_computeLeafNodeAssignment()) {
        cs += ', leaf_node_assignment: true';
      }
    }

    if (_hasExemplarIndex()) {
      cs += `, exemplar_index: ${_exemplarIndexValue()}`;
    }

    return _.insertAndExecuteCell('cs', cs);
  };

  defer(_go);

  return {
    destinationKey: _destinationKey,
    exception: _exception,
    hasModels: _hasModels,
    hasFrames: _hasFrames,
    canPredict: _canPredict,
    selectedFramesCaption: _selectedFramesCaption,
    selectedModelsCaption: _selectedModelsCaption,
    selectedFrame: _selectedFrame,
    selectedModel: _selectedModel,
    frames: _frames,
    models: _models,
    predict,
    isDeepLearning: _isDeepLearning,
    hasReconError: _hasReconError,
    hasLeafNodeAssignment: _hasLeafNodeAssignment,
    hasExemplarIndex: _hasExemplarIndex,
    computeReconstructionError: _computeReconstructionError,
    computeDeepFeaturesHiddenLayer: _computeDeepFeaturesHiddenLayer,
    computeLeafNodeAssignment: _computeLeafNodeAssignment,
    deepFeaturesHiddenLayer: _deepFeaturesHiddenLayer,
    exemplarIndex: _exemplarIndex,
    template: 'flow-predict-input'
  };
};

