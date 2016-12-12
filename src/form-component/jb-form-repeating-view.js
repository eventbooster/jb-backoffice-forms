(function(undefined){
    "use strict";
    var _module = angular.module('jb.formComponents');

    function JBFormRepeatingViewController(componentsService, $compile, $scope, $timeout){
        this.componentsService  = componentsService;
        this.componentsRegistry = null;
        this.$compile           = $compile;
        this.$scope             = $scope;
        this.type               = 'JBFormRepeating';
        this.optionData         = null;
        this.$timeout           = $timeout;
        this.entities           = [undefined];
    }

    JBFormRepeatingViewController.prototype.preLink = function(scope){
        // listens to all events coming from within
        this.componentsRegistry = this.componentsService.registryFor(scope);
        this.componentsRegistry.listen();
        this.componentsRegistry.onUnregistration(function(component, index){
            this.entities.splice(index, 1);
        }.bind(this));
    };

    JBFormRepeatingViewController.prototype.postLink = function(scope){
        this.componentsService.registerComponent(scope, this);
    };

    JBFormRepeatingViewController.prototype.getSelectFields = function(){
        return this.componentsRegistry.getSelectFields();
    };

    JBFormRepeatingViewController.prototype.getSaveCalls = function(){
        return this.componentsRegistry.getSaveCalls();
    };

    JBFormRepeatingViewController.prototype.afterSaveTasks = function(id){
        return this.componentsRegistry.afterSaveTasks(id);
    };

    JBFormRepeatingViewController.prototype.beforeSaveTasks = function(entity){
        return this.componentsRegistry.beforeSaveTasks(entity);
    };

    JBFormRepeatingViewController.prototype.isValid = function(){
        return this.componentsRegistry.isValid();
    };

    JBFormRepeatingViewController.prototype.registerAt = function(parent){
        parent.registerOptionsDataHandler(this.handleOptionsData.bind(this));
        parent.registerGetDataHandler(this.handleGetData.bind(this));
    };

    JBFormRepeatingViewController.prototype.unregisterAt = function(parent){
        parent.unregisterOptionsDataHandler(this.handleOptionsData);
        parent.unregisterGetDataHandler(this.handleGetData);
    };

    /*
     * Due to the fact that the inner entities are usually included in an ng-repat directive, we need to make
     * sure that at least one view was rendered.
     */
    JBFormRepeatingViewController.prototype.handleOptionsData = function(optionsData){
        this.optionData = optionsData;
        return this.$timeout(function(){
            return this.componentsRegistry.optionsDataHandler(optionsData);
        }.bind(this));

    };
    // We assume that the data we got delivered is an array?
    // now we should add a new copy of the inner view to all
    // @todo: use arrow functions
    // @todo: do we need to trigger two digests to be sure that all sub views are unlinked?
    JBFormRepeatingViewController.prototype.handleGetData = function(data){
        return this.$timeout(function(){
            this.entities.splice(0);
        }.bind(this), 0)
            .then(function(){
                if(data){
                    return this.$timeout(function(){
                        var   content = data[this.entityName] || [];
                        content.forEach(function(entry){
                            this.entities.push(entry);
                        }, this);
                    }.bind(this), 0)
                }
            }.bind(this))
            .then(function(){
                return this.$timeout(function() {
                    this.componentsRegistry
                        .optionsDataHandler(this.optionData)
                        .then(function(success) {
                            return this.componentsRegistry.distributeIndexed(data);
                            //return value;
                        }.bind(this)
                        , function(error) {
                            console.error(error);
                        });
                }.bind(this), 0);
            }.bind(this));
    };

    JBFormRepeatingViewController.prototype.addElement = function(){
        this.entities.push({});
        this.$timeout(function(){
            return this.componentsRegistry.optionsDataHandler(this.optionData);
        }.bind(this));
    };

    _module.controller('JBFormRepeatingViewController', [
          'JBFormComponentsService'
        , '$compile'
        , '$scope'
        , '$timeout'
        , JBFormRepeatingViewController
    ]);

    _module.directive('jbFormRepeatingView', ['$compile', '$parse', function($compile, $parse){
        return {
              scope             : true
            , bindToController  : true
            , controllerAs      : '$ctrl'
            , controller        : 'JBFormRepeatingViewController'
            , link              : {

                  pre: function(scope, element, attrs, ctrl){
                    ctrl.preLink(scope);
                }

                , post: function(scope, element, attrs, ctrl){

                    attrs.$observe('entityName', function(newValue){
                        ctrl.entityName = newValue;
                    });

                    attrs.$observe('buttonText', function(newValue){
                        ctrl.buttonText = newValue;
                        scope.buttonText = newValue;
                    });

                    ctrl.postLink(scope);

                    scope.addElement = function(event){
                        if(event){
                            event.preventDefault();
                            event.stopPropagation();
                        }
                        ctrl.addElement();
                    };

                    /*var button = angular.element('<div class="container clearfix"><button class="btn btn-sm btn-default pull-right" ng-click="addElement($event)">{{ $ctrl.buttonText | translate }}</button></div>');
                    element.append(button);
                    $compile(button)(scope);*/
                }
            }
        }
    }]);
})();