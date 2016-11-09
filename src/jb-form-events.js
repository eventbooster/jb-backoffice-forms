(function(){
    var mod = angular.module('jb.formEvents', []);
    mod.provider('jbFormEvents', function JBFormEventsProvider(){
        var eventKeys = {
            // used to register components, e.g. at the detail view
            registerComponent: 'jb.backoffice-form-event.registerComponent'
        };

        this.setEventKey = function(accessor, key){
            eventKeys[accessor] = key;
        };

        this.hasEventKeyAt = function(accessor){
            return angular.isDefined(eventKeys[accessor]);
        };

        this.getEventKeyAt = function(accessor){
            return eventKeys[accessor];
        };

        this.removeEventKey = function(accessor){
            delete eventKeys[accessor];
        } ;

        this.$get = [function(){
            return Object.freeze(eventKeys);
        }];
    });

    function JBFormComponentsRegistry($q, formEvents, scope){
        this.registeredComponents   = [];
        this.scope                  = scope;
        this.optionsDataHandlers    = [];
        this.getDataHandlers        = [];
        this.$q                     = $q;
        this.formEvents             = formEvents;
    }

    JBFormComponentsRegistry.prototype.listen = function(){
        this.scope.$on(this.formEvents.registerComponent, function(event, component){
            console.log('REGISTRATION OF:', component);
            // this check should not be necessary anymore, since we emit the registration event on the parent scope
            if(component === this) return;
            event.stopPropagation();
            this.registerComponent(component);
        }.bind(this));
        return this;
    };

    JBFormComponentsRegistry.prototype.registerComponent = function(component){
        this.registeredComponents.push(component);
        component.registerAt(this);
    };

    JBFormComponentsRegistry.prototype.getSaveCalls = function(){
        return this.registeredComponents.reduce(function(calls, component){
            var subcalls = component.getSaveCalls();
            return calls.concat(component.getSaveCalls());
        }, []);
    };

    JBFormComponentsRegistry.prototype.isValid = function(){
        for(var i = 0; i < this.registeredComponents.length; i++){
            if(this.registeredComponents[i].isValid() === false) return false;
        }
        return true;
    };

    JBFormComponentsRegistry.prototype.getAfterSaveTasks = function(id){
        var calls = this.registeredComponents.reduce(function(subcalls, component){
            if(angular.isFunction(component.afterSaveTasks)){
                return subcalls.concat(component.afterSaveTasks(id));
            }
            return subcalls;
        }, []);
        return this.$q.all(calls);
    };

    JBFormComponentsRegistry.prototype.getBeforeSaveTasks = function(entity){
        var calls = this.registeredComponents.reduce(function(tasks, component){
            if(angular.isFunction(component.beforeSaveTasks)){
                tasks.push(component.beforeSaveTasks(entity));
            }
            return tasks;
        }, []);
        return this.$q.all(calls);
    };

    JBFormComponentsRegistry.prototype.getSelectFields = function () {
        return this.registeredComponents.reduce(function (selects, component) {
            if (angular.isFunction(component.getSelectFields)) return selects.concat(component.getSelectFields());
            if (angular.isDefined(component.select)) return selects.concat(component.select);
            return selects;
        }, []);
    };
    /**
     * @param data
     */
    JBFormComponentsRegistry.prototype.optionsDataHandler = function(data){
        return this.$q.all(this.optionsDataHandlers.map(function(handler){
            return this.$q.when(handler(data));
        }, this));
    };

    JBFormComponentsRegistry.prototype.registerOptionsDataHandler = function(handler){
        this.optionsDataHandlers.push(handler);
    };

    JBFormComponentsRegistry.prototype.registerGetDataHandler = function(handler){
        this.getDataHandlers.push(handler);
    };

    JBFormComponentsRegistry.prototype.unregisterGetDataHandler = function(handler){
        this.getDataHandlers.splice(this.getDataHandlers.indexOf(handler), 1);
    };

    JBFormComponentsRegistry.prototype.unregisterOptionsDataHandler = function(handler){
        this.optionsDataHandlers.splice(this.optionsDataHandlers.indexOf(handler), 1);
    };

    JBFormComponentsRegistry.prototype.getDataHandler = function(data){
        this.getDataHandlers.forEach(function(handler){
            handler(data);
        });
    };

    JBFormComponentsRegistry.prototype.registerYourself = function(scope){
        (scope || this.scope).$parent.$emit(this.formEvents.registerComponent, this);
    };

    JBFormComponentsRegistry.prototype.registerAt = function(parent){
        parent.registerOptionsDataHandler(this.optionsDataHandler.bind(this));
        parent.registerGetDataHandler(this.getDataHandler.bind(this));
    };

    mod.factory(
        'JBFormComponentsService' ,
        [
            '$q' ,
            'jbFormEvents' ,
            function($q, formEvents){
                return {
                    registryFor   : function(scope){
                        var registry = new JBFormComponentsRegistry($q, formEvents, scope);
                        return registry;
                    }
                    , registerComponent : function(scope, component){
                        scope.$parent.$emit(formEvents.registerComponent, component);
                    }
                }
            }
        ]);
})();