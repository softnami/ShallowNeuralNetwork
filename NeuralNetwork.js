/**
Copyright (c) 2015-2016 Hussain Mir Ali
**/
"use strict";

var window_object = (function(g) {
  return g;
}(this));

/**
 * The NeuralNetwork class contains all the necessary logic to train data for multiclass classification using single layer Neural Network.
 *
 * @class NeuralNetwork
 * @constructor
 * @param {Object} args Contains all the necessary parameters for the neural network as listed below.
 * @param {Number} args.learningRate Learning rate for BackPropogation.
 * @param {Number} args.threshold_value Optional threshold value for error. 
 * @param {Number} args.regularization_parameter Optional regularization parameter to prevent overfitting. 
 * @param {Number} args.notify_count Optional value to execute the iteration_callback after every x number of iterations.
 * @param {Function} args.iteration_callback Optional callback that can be used for getting cost and iteration value on every notify count.
 * @param {Number} args.hiddenLayerSize Optional value for number of hidden layer units.
 * @param {Number} args.maximum_iterations Optional maximum iterations to be allowed before the optimization is complete. 
 * @param {Object} args.optimization_mode Optional optimzation(gradient descent) mode. For batch gradient descent optimization_mode =  {'mode': 0} and for mini-batch gradient descent optimization_mode =  {'mode': 1, 'batch_size': (specify  required size) }. 
 **/

var NeuralNetwork = function(args) {
  if (Object.keys(window_object).length === 0) {
    this.MathJS = require('mathjs');
    this.q = require('q');
  } else {
    this.MathJS = math;
    this.q = Q;
  }
  this.initArgs = args;
  this.threshold = args.threshold || (1 / this.MathJS.exp(3));
  this.iteration_callback = args.iteration_callback;
  this.hiddenLayerSize = args.hiddenLayerSize;
  this.regularization_param = args.regularization_param || 0.01;
  this.learningRate = args.learningRate || 0.5;
  this.optimization_mode = (args.optimization_mode === undefined) ? {
    'mode': 0
  } : args.optimization_mode;
  this.maximum_iterations = args.maximum_iterations || 1000;
  this.notify_count = args.notify_count || 100;
};

/**
 * This method returns all the parameters passed to the constructor.
 *
 * @method getInitParams
 * @return {Object} Returns the constructor parameters.
 */

NeuralNetwork.prototype.getInitParams = function() {
  return {
    'hiddenLayerSize': this.hiddenLayerSize,
    'optimization_mode': this.optimization_mode,
    'notify_count': this.notify_count,
    'iteration_callback': this.iteration_callback,
    'threshold': this.threshold,
    'regularization_param': this.regularization_param,
    'learningRate': this.learningRate,
    'maximum_iterations': this.maximum_iterations
  };
};

/**
 * This method serves as the logic for the sigmoid function.
 *
 * @method sigmoid
 * @param {matrix} z The matrix to be used as the input for the sigmoid function. 
 * @return {matrix} Returns the elementwise sigmoid of the input matrix.
 */

NeuralNetwork.prototype.sigmoid = function(z) {
  var scope = {
      z: (typeof(z) === "number") ? this.MathJS.matrix([
        [z]
      ]) : z
    },
    sigmoid;
  if (scope.z.size()[1] === undefined)
    scope.ones = this.MathJS.ones(scope.z.size()[0]);
  else
    scope.ones = this.MathJS.ones(scope.z.size()[0], scope.z.size()[1]);
  sigmoid = this.MathJS.eval('(ones+(e.^(z.*-1))).^-1', scope); //1/(1+e^(-z))
  return sigmoid;
};

/**
 *This method is responsible for the forwardPropagation in the Neural Network.
 *
 * @method forwardPropagation 
 * @param {matrix} X The input matrix representing the features.
 * @param {matrix} W1 The matrix representing the weights for layer 1.
 * @param {matrix} W2 The matrix representing the weights for layer 2.
 * @param {matrix} bias_l1 The matrix representing the bias for layer 1.
 * @param {matrix} bias_l2 The matrix representing the bias for layer 2.
 * @return {matrix} Returns the resultant ouput of forwardPropagation.
 */
NeuralNetwork.prototype.forwardPropagation = function(X, W1, W2, bias_l1, bias_l2) {
  var y_result, X = this.MathJS.matrix(X) || this.x,
    scope = {};
  this.W1 = W1 || this.W1;
  this.W2 = W2 || this.W2;
  this.z2 = this.MathJS.multiply(X, this.W1);
  scope.z2 = this.z2;

  scope.ones_l1 =  this.MathJS.ones(X.size()[0], this.bias_l1.size()[0]);
  scope.bias_l1 = this.bias_l1;
  scope.resized_bias_l1 = this.MathJS.eval('ones_l1*bias_l1',scope);

  scope.ones_l2 =  this.MathJS.ones(X.size()[0], this.bias_l2.size()[0]);
  scope.bias_l2 = this.bias_l2;
  scope.resized_bias_l2 = this.MathJS.eval('ones_l2*bias_l2',scope);

  scope.bias_l1 = bias_l1 || scope.resized_bias_l1;
  scope.bias_l2 = bias_l2 || scope.resized_bias_l2;

  this.z2 = this.MathJS.eval('z2+bias_l1', scope);
  this.a2 = this.sigmoid(this.z2);
  this.z3 = this.MathJS.multiply(this.a2, this.W2);
  scope.z3 = this.z3;

  this.z3 = this.MathJS.eval('z3+bias_l2', scope);
  y_result = this.sigmoid(this.z3);
  return y_result;
};

/**
 * This method serves as the logic for the sigmoid function derivative.
 *
 * @method sigmoid_Derivative
 * @param {matrix} z The matrix to be used as the input for the sigmoid function derivative. 
 * @return {matrix} Returns the elementwise sigmoid derivative of the input matrix.
 */
NeuralNetwork.prototype.sigmoid_Derivative = function(z) {
  var scope = {
      z: z
    },
    sigmoid_Derivative;
  scope.ones = this.MathJS.ones(z.size()[0], z.size()[1]);
  sigmoid_Derivative = this.MathJS.eval('(e.^(z.*-1))./(ones+(e.^(z.*-1))).^2', scope); //(1+e^(-z))/(1+e^(-z))^2

  return sigmoid_Derivative;
};

/**
 *This method is responsible for the costFunction, i.e. error.
 *
 * @method costFunction 
 * @param {matrix} X The input matrix representing the features.
 * @param {matrix} Y The output matrix corresponding to training data.
 * @param {matrix} W1 The matrix representing the weights for layer 1.
 * @param {matrix} W2 The matrix representing the weights for layer 2.
 * @param {Number} iteration_count Is the iteration count since the training started.
 * @return {Number} Returns the resultant cost.
 */
NeuralNetwork.prototype.costFunction = function(X, Y, W1, W2,iteration_count) {
  var J, batch_size;
  var scope = {};

  scope.y = this.MathJS.matrix(Y);
  scope.x = this.MathJS.matrix(X);
  scope.W1 = W1||this.W1;
  scope.W2 = W2||this.W2;

  if (this.optimization_mode.mode === 1) { //cost for mini-batch gradient descent.
    batch_size = this.optimization_mode.batch_size;

    scope.x = this.MathJS.matrix(scope.x._data.slice(batch_size * iteration_count, batch_size + (batch_size * iteration_count)));
    scope.y = this.MathJS.matrix(scope.y._data.slice(batch_size * iteration_count, batch_size + (batch_size * iteration_count)));

    this.y_result = this.forwardPropagation(scope.x, undefined, undefined, undefined, undefined);
    scope.y_result = this.y_result;

    J = this.MathJS.sum(this.MathJS.eval('0.5*((y-y_result).^2)', scope)) / (this.optimization_mode.batch_size) + (this.regularization_param / 2) * (this.MathJS.sum(this.MathJS.eval('W1.^2', scope)) + this.MathJS.sum(this.MathJS.eval('W2.^2', scope))); //cost with regularization parameter.
  } else if (this.optimization_mode.mode === 0) { //cost with batch gradient descent.
    this.y_result = this.forwardPropagation(scope.x, undefined, undefined, undefined, undefined);
    scope.y_result = this.y_result;

    J = this.MathJS.sum(this.MathJS.eval('0.5*((y-y_result).^2)', scope)) / (scope.x.size()[0]) + (this.regularization_param / 2) * (this.MathJS.sum(this.MathJS.eval('W1.^2', scope)) + this.MathJS.sum(this.MathJS.eval('W2.^2', scope))); //cost with regularization parameter.
  }

  return J;
};

/**
 *This method is responsible for the costFunction_Derivative, i.e. gradient of error with respect to weights.
 *
 * @method costFunction_Derivative 
 * @param {matrix} X The input matrix representing the features.
 * @param {matrix} Y The output matrix corresponding to training data.
 * @param {matrix} W1 The matrix representing the weights for layer 1.
 * @param {matrix} W2 The matrix representing the weights for layer 2.
 * @param {Number} iteration_count Is the iteration count since the training started.
 * @return {Array} Returns the resultant gradients with respect to layer 1: dJdW1 and layer 2: dJdW2 of the Neural Network.
 */

NeuralNetwork.prototype.costFunction_Derivative = function(X, Y, W1, W2, iteration_count) {
  if (this.optimization_mode.mode === 1) {

    this.x = X || this.x;
    this.y = Y || this.y;

    var batch_size = this.optimization_mode.batch_size;
    var X = this.MathJS.matrix(this.x._data.slice(batch_size * iteration_count, batch_size + (batch_size * iteration_count)));
    var Y = this.MathJS.matrix(this.y._data.slice(batch_size * iteration_count, batch_size + (batch_size * iteration_count)));

  }

  this.x = X || this.x;
  this.y_result = this.forwardPropagation(this.x, undefined, undefined, undefined, undefined);
  var scope = {};
  scope.y_result = this.y_result;
  scope.y = Y || this.y;
  scope.x = X || this.x;

  scope.diff = this.MathJS.eval('-(y-y_result)', scope);
  scope.sigmoid_Derivative_z3 = this.sigmoid_Derivative(this.z3);
  scope.regularization_param = this.regularization_param;
  scope.W2 = W2 || this.W2;
  scope.W1 = W1 || this.W1;
  scope.m = scope.x.size()[0];

  var del_3 = this.MathJS.eval('diff.*sigmoid_Derivative_z3', scope);
  var dJdW2 = this.MathJS.multiply(this.MathJS.transpose(this.a2), del_3);
  scope.dJdW2 = dJdW2;
  scope.regularization_term_dJdW2 = this.MathJS.eval('W2.*regularization_param', scope);

  dJdW2 = this.MathJS.eval('dJdW2.*(1/m) + regularization_term_dJdW2', scope);

  scope.arrA = this.MathJS.multiply(del_3, this.MathJS.transpose(this.W2));
  scope.arrB = this.sigmoid_Derivative(this.z2);

  var del_2 = this.MathJS.eval('arrA.*arrB', scope);
  var dJdW1 = this.MathJS.multiply(this.MathJS.transpose(scope.x), del_2);

  scope.dJdW1 = dJdW1;
  scope.regularization_term_dJdW1 = this.MathJS.eval('W1.*regularization_param', scope);

  dJdW1 = this.MathJS.eval('dJdW1.*(1/m) + regularization_term_dJdW1', scope);

  return [dJdW1, dJdW2, del_2, del_3];

};

/**
 *This method is responsible for saving the trained weights and biases of the Neural Network.
 *
 * @method saveWeights 
 * @param {Matrix} weights The weights of the layer1 and layer2 of the Neural Network.
 * @param {Matrix} biases The biases of the layer1 and layer2 of the Neural Network.
 * @return {Boolean} Returns true after succesfuly saving the weights.
 */
NeuralNetwork.prototype.saveWeights = function(weights, biases) {
  var defered = this.q.defer();
  if (Object.keys(window_object).length === 0) {
    global.localStorage.setItem("Weights", JSON.stringify(weights));
    global.localStorage.setItem("Biases", JSON.stringify(biases));
  } else {
    localStorage.setItem("Weights", JSON.stringify(weights));
    localStorage.setItem("Biases", JSON.stringify(biases));
  }
  console.log("\nWeights were successfuly saved.");
  return true;
};

/**
 *This method is responsible for setting bias for layers 1 and 2.
 *
 * @method setBias 
 * @param {Number} bias_l1 The bias for layer1.
 * @param {Number} bias_l2 The bias for layer 2.
 */
NeuralNetwork.prototype.setBias = function(bias_l1, bias_l2) {
  this.bias_l1 = bias_l1;
  this.bias_l2 = bias_l2;  
};



/**
* This method randomizes matrix element order in-place using Durstenfeld shuffle algorithm.
*
* @method shuffleMatrix 
* @param {Matrix} matrix The first matrix to be shuffled.
* @param {Matrix} matrix2 The second matrix to be shuffled.
*/
 NeuralNetwork.prototype.shuffleMatrix = function(matrix, matrix2) {
            for (var i = matrix.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                
                var temp = matrix[i];
                matrix[i] = matrix[j];
                matrix[j] = temp;

                var temp2 = matrix2[i];
                matrix2[i] = matrix2[j];
                matrix2[j] = temp2;
            }
            return [matrix, matrix2];
  }


/**
 *This method is responsible for the optimization of weights, i.e. BackPropagation algorithm.
 *
 * @method gradientDescent
 * @param {matrix} X The input matrix representing the features.
 * @param {matrix} Y The output matrix corresponding to training data.
 * @param {matrix} W1 The matrix representing the weights for layer 1.
 * @param {matrix} W2 The matrix representing the weights for layer 2.
 * @return {Object} Returns a resolved promise with iteration and cost data on successful completion of optimization. 
 */
NeuralNetwork.prototype.gradientDescent = function(X, Y, W1, W2) {
  var gradient = new Array(2),
    self = this,
    x = X || this.x,
    y = Y || this.y,
    W1 = W1,
    W2 = W2,
    cost,
    scope = {},
    defered = this.q.defer(),
    i = 1, inner_iterations =0, epochs = 0;

  console.log('Training ...\n');

  while (true) {

    if (x !== undefined && y !== undefined && W1 !== undefined && W2 !== undefined)
      gradient = this.costFunction_Derivative(x, y, W1, W2, inner_iterations);
    else
      gradient = this.costFunction_Derivative(x, y, undefined, undefined, inner_iterations);
    scope.W1 = W1 || this.W1;
    scope.W2 = W2 || this.W2;
    scope.rate = this.learningRate;
    scope.dJdW1 = gradient[0];
    scope.dJdW2 = gradient[1];
    scope.bias_l1 = this.bias_l1;
    scope.bias_l2 = this.bias_l2;
    scope.del_3 = gradient[3];
    scope.del_3_mean = this.MathJS.mean(gradient[3],0);
    scope.del_3_size = scope.del_3.size()[0];
    scope.del_3 = [this.MathJS.eval('del_3_size*del_3_mean',scope)];

    scope.del_2 = gradient[2];
    scope.del_2_mean = this.MathJS.mean(gradient[2],0);
    scope.del_2_size = scope.del_2.size()[0];
    scope.del_2 = [this.MathJS.eval('del_2_size*del_2_mean',scope)];

    this.W2 = this.MathJS.eval('W2 - dJdW2.*rate', scope);
    this.W1 = this.MathJS.eval('W1 - dJdW1.*rate', scope);

    this.bias_l1 = this.MathJS.eval('bias_l1-del_2', scope);
    this.bias_l2 = this.MathJS.eval('bias_l2-del_3', scope);

    if (x !== undefined && y !== undefined)
      cost = this.costFunction(x, y, undefined, undefined, inner_iterations);
    if (i % this.notify_count === 0 && this.iteration_callback !== undefined) {
      this.iteration_callback.apply(this, [{
        'cost': cost,
        'epochs':epochs,
        'iteration': i /*iteration count*/ ,
        'Weights_Layer1': self.W1,
        'Weights_Layer2': self.W2,
        'Bias_Layer1': self.bias_l1,
        'Bias_Layer2': self.bias_l2,
        'gradient': gradient
      }]); //notify cost values for diagnosing the performance of learning algorithm.
    }
    
    i++;
    inner_iterations++;

    if(this.optimization_mode.mode === 1){
        if(this.optimization_mode.batch_size + (this.optimization_mode.batch_size  * inner_iterations)>=x.size()[0]){
           inner_iterations  = 0;
           epochs++;
           var shufflmatrx = this.shuffleMatrix(x, y);
           x = shufflmatrx[0];
           y = shufflmatrx[1];
        }
    }if(this.optimization_mode.mode === 0){
           epochs++;
           var shufflmatrx = this.shuffleMatrix(x, y);
           x = shufflmatrx[0];
           y = shufflmatrx[1];
    }

    if (i> this.maximum_iterations || cost <= (this.threshold)) {
      this.saveWeights([this.W1, this.W2],[this.bias_l1, this.bias_l2]);
      defered.resolve([cost, i]);
      return defered.promise;
    }
  }
};

/**
 *This method is responsible for creating layers and initializing random weights. 
 *
 * @method train_network
 * @param {matrix} X The input matrix representing the features of the training set.
 * @param {matrix} Y The output matrix corresponding to training set data.
 * @return {Object} Returns a resolved promise with iteration and cost data on successful completion of optimization. 
 */
NeuralNetwork.prototype.train_network = function(X, Y) {
  this.x = this.MathJS.matrix(X);
  this.y = this.MathJS.matrix(Y);

  if ((this.y.size()[0] !== this.x.size()[0])) {
    console.log('\nPlease change the size of the input matrices so that X and Y have same number of rows.');
  } else {
    this.inputLayerSize = this.x.size()[1];
    this.outputLayerSize = 1;
    if (this.hiddenLayerSize !== undefined) {
      if (this.hiddenLayerSize >= this.x.size()[1] + 1)
        this.hiddenLayerSize = this.hiddenLayerSize;
      else
        this.hiddenLayerSize = this.x.size()[1] + 1;
    } else if (this.hiddenLayerSize === undefined)
      this.hiddenLayerSize = this.x.size()[1] + 1;

    this.W1 = (this.MathJS.random(this.MathJS.matrix([this.inputLayerSize, this.hiddenLayerSize]), -10, 10));
    this.W2 = (this.MathJS.random(this.MathJS.matrix([this.hiddenLayerSize, this.outputLayerSize * this.y.size()[1]]), -10, 10));
    this.bias_l1 = this.MathJS.matrix([this.MathJS.ones(this.hiddenLayerSize)._data]);
    this.bias_l2 = this.MathJS.matrix([this.MathJS.ones(this.y.size()[1])._data]);
  }
  return this.gradientDescent(undefined, undefined, undefined, undefined);
};

/**
 *This contains logic to predict result for a given input after training on data. 
 *
 * @method predict_result
 * @param {matrix} X The input matrix representing the features.
 * @return {matrix} Returns the resultant matrix after performing forwardPropagation on saved weights.
 */

NeuralNetwork.prototype.predict_result = function(X) {
  var y_result;
  this.setWeights();
  y_result = this.forwardPropagation(X, undefined, undefined, undefined, undefined);
  return y_result;
};

/**
 *This method is responsible for setting weights and biases of the Neural Network from storage.
 *
 * @method setWeights 
 * @return {Object} Returns a resolved promise after successfuly setting weights and biases.
 */
NeuralNetwork.prototype.setWeights = function() {
  var self = this;
  var weights, biases;
  if (Object.keys(window_object).length === 0) {
    weights = JSON.parse(global.localStorage.getItem("Weights"));
    biases = JSON.parse(global.localStorage.getItem("Biases"));
  } else {
    weights = JSON.parse(localStorage.getItem("Weights"));
    biases = JSON.parse(localStorage.getItem("Biases"));
  }

  self.W1 = this.MathJS.matrix(weights[0].data);
  self.W2 = this.MathJS.matrix(weights[1].data);

  self.bias_l1 = this.MathJS.matrix(biases[0].data);
  self.bias_l2 = this.MathJS.matrix(biases[1].data);

  return [self.W1._data, self.W2._data, self.bias_l1, self.bias_l2];
};


if (Object.keys(window_object).length === 0) {
  module.exports = NeuralNetwork;
} else {
  window['NeuralNetwork'] = NeuralNetwork;
}