(function(undefined){
    "use strict";
    var _module = angular.module('jb.formComponents');

    function JBFormRepeatingViewController(componentsService, $compile, $scope, $timeout, $q){
        this.componentsService  = componentsService;
        this.componentsRegistry = null;
        this.$compile           = $compile;
        this.$scope             = $scope;
        this.type               = 'JBFormRepeating';
        this.optionData         = null;
        this.$timeout           = $timeout;
        this.$q                 = $q;
        this.entities           = [undefined];
    }

    JBFormRepeatingViewController.prototype.preLink = function(scope){
        // listens to all events coming from within
        // todo: the unregistration is triggered for all elements if we change the amount of entities (so the view might be empty)
        this.componentsRegistry = this.componentsService.registryFor(scope);
        this.componentsRegistry.listen();
        scope.$on('removeElement', function(event, index){
            console.log('JBFormRepeatingViewController: Remove item %o', index);
            event.stopPropagation();
            if(this.isReadonly === true) return;
            this.removeElement(index);
        }.bind(this));
    };

    JBFormRepeatingViewController.prototype.postLink = function(scope){
        this.componentsService.registerComponent(scope, this);
    };

    JBFormRepeatingViewController.prototype.getSelectFields = function(){
        return this.componentsRegistry.getSelectFields();
    };

    JBFormRepeatingViewController.prototype.getSaveCalls = function(){
        if(this.isReadonly === true) return [];
        return this.componentsRegistry.getSaveCalls();
    };

    JBFormRepeatingViewController.prototype.afterSaveTasks = function(id){
        if(this.isReadonly === true) return;
        return this.componentsRegistry.afterSaveTasks(id);
    };

    JBFormRepeatingViewController.prototype.beforeSaveTasks = function(entity){
        if(this.isReadonly === true) return;
        return this.componentsRegistry.beforeSaveTasks(entity);
    };

    JBFormRepeatingViewController.prototype.isValid = function(){
        if(this.isReadonly === true) return true;
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
                if(data && data[this.entityName]){
                    this.entities = data[this.entityName];
                } else {
                    this.entities = [];
                }
                this.data = data;
            }.bind(this))
            .then(function(){
                this.distributeOptionsAndData(this.optionData, data, 0);
            }.bind(this));
    };

    JBFormRepeatingViewController.prototype.addElement = function(index){

        if(this.isReadonly) return;

        this.entities.push({isDummy: true});
        console.log('JBFormRepeatingViewController: Added element, entities are %o', this.entities);

        //todo: if we distribute the data like this, the lower form view adapters reset their entity, fix this.
        var data = {};
        data[this.entityName] = this.entities;

        return this.distributeOptionsAndData(this.optionData, data, this.entities.length - 1);
    };

    JBFormRepeatingViewController.prototype.distributeOptionsAndData = function(options, data, startIndex){
        return this.$timeout(function() {
            this.componentsRegistry
                .optionsDataHandler(options)
                .then(function(success) {
                        return this.componentsRegistry.distributeIndexedFrom(data, startIndex);
                    }.bind(this)
                    , function(error) {
                        console.error(error);
                    });
        }.bind(this));
    };

    JBFormRepeatingViewController.prototype.removeElement = function(index){
        
        if(this.isReadonly) return;

        var   component   = this.componentsRegistry.componentAt(index)
            , basePromise = this.$q.when()
            , self        = this;

        return basePromise
            .then(function(success){
                self.entities.splice(index, 1);
            })
            .then(function(success){
                return self.$timeout(function(){
                    // Update itemIndex on every registered component to match new index
                    self.componentsRegistry.registeredComponents.forEach(function(component, index) {
                        component.strategy.updateIndex(index);
                    });
                    //return self.componentsRegistry.optionsDataHandler(self.optionData);
                });
            }.bind(this)).catch(function(error){
                console.error(error);
            });
    };

    _module.controller('JBFormRepeatingViewController', [
          'JBFormComponentsService'
        , '$compile'
        , '$scope'
        , '$timeout'
        , '$q'
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

                    var   hasReadonlyFlag = attrs.hasOwnProperty('isReadonly')
                        , readonlyGetter;

                    if(hasReadonlyFlag){
                        readonlyGetter = $parse(attrs.isReadonly);
                        scope.$watch(function(){
                            return readonlyGetter(scope.$parent);
                        }, function(isReadonly){
                            ctrl.isReadonly = isReadonly === true;
                        });
                    }

                    attrs.$observe('entityName', function(newValue){
                        ctrl.entityName = newValue;
                    });

                    attrs.$observe('buttonText', function(newValue){
                        ctrl.buttonText = newValue;
                        scope.buttonText = newValue;
                    });

                    ctrl.postLink(scope);

                    scope.addElement = function(event, index){
                        console.log('jbFormRepeatingView: Add element');
                        if(event) event.preventDefault();
                        return ctrl.addElement(index);
                    };

                    scope.removeElement = function(event, index){
                        if(event) event.preventDefault();
                        return ctrl.removeElement(index);
                    };
                }
            }
        }
    }]);
})();