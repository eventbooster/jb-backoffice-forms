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
        this.unregistrationHandlers  = [];
    }

    JBFormComponentsRegistry.prototype.listen = function(){
        this.scope.$on(this.formEvents.registerComponent, function(event, component, sourceScope){
            console.log('REGISTRATION OF:', component);
            // this check should not be necessary anymore, since we emit the registration event on the parent scope
            if(component === this) return;
            event.stopPropagation();
            sourceScope.$on('$destroy', function(){
                this.unregisterComponent(component);
            }.bind(this));
            this.registerComponent(component);
        }.bind(this));
        return this;
    };

    JBFormComponentsRegistry.prototype.registerComponent = function(component){
        this.registeredComponents.push(component);
        component.registerAt(this);
    };

    JBFormComponentsRegistry.prototype.onUnregistration = function(callback){
        this.unregistrationHandlers.push(callback);
    };

    JBFormComponentsRegistry.prototype.unregisterComponent = function(component){
        var index = this.registeredComponents.indexOf(component);
        if(index >= 0) {
            if(!angular.isFunction(component.unregisterAt)){
                //debugger;
                console.warn('JBFormComponentsRegistry: Component %o does not know how to react to unlinking', component);
            } else {
                component.unregisterAt(this);
            }
            this.registeredComponents.splice(index, 1);
            this.unregistrationHandlers.forEach(function(handler){
                handler(component, index);
            });
        }
    };


    JBFormComponentsRegistry.prototype.getSaveCalls = function(){
        return this.registeredComponents.reduce(function(calls, component){
            if(!angular.isFunction(component.getSaveCalls)) debugger;
            var subcalls = component.getSaveCalls();
            return calls.concat(subcalls);
        }, []);
    };

    JBFormComponentsRegistry.prototype.isValid = function(){
        for(var i = 0; i < this.registeredComponents.length; i++){
            if(this.registeredComponents[i].isValid() === false) return false;
        }
        return true;
    };

    JBFormComponentsRegistry.prototype.afterSaveTasks = function(id){
        return this.getAfterSaveTasks(id);
    };

    JBFormComponentsRegistry.prototype.getAfterSaveTasks = function(id){
        var calls = this.registeredComponents.reduce(function(subcalls, component){
            if(angular.isFunction(component.afterSaveTasks)){
                return subcalls.concat(component.afterSaveTasks(id));
            }
            return subcalls;
        }, []);
        return this.$q.all(calls).then(function(){
          return id;
        });
    };

    JBFormComponentsRegistry.prototype.beforeSaveTasks = function(entity){
        return this.getBeforeSaveTasks(entity);
    };

    JBFormComponentsRegistry.prototype.getBeforeSaveTasks = function(entity){
        var calls = this.registeredComponents.reduce(function(tasks, component){
            if(angular.isFunction(component.beforeSaveTasks)){
                tasks.push(component.beforeSaveTasks(entity));
            }
            return tasks;
        }, []);
        return this.$q.all(calls).then(function(){
            return entity;
        });
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
        }, this)).then(function(){
            return data;
        });
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
    /**
     * Distributes all the items in the collection after the other to the internal handlers.
     *
     * @note: does not check if there are more handlers than data
     * @param collection
     */
    JBFormComponentsRegistry.prototype.distributeIndexed = function(data){
        this.getDataHandlers.forEach(function(handler, index){
            handler(data, index);
        });
    };

    JBFormComponentsRegistry.prototype.registerYourself = function(scope){
        var targetScope = scope || this.scope;
        targetScope.$parent.$emit(this.formEvents.registerComponent, this, targetScope);
    };

    JBFormComponentsRegistry.prototype.registerAt = function(parent){
        parent.registerOptionsDataHandler(this.optionsDataHandler.bind(this));
        parent.registerGetDataHandler(this.getDataHandler.bind(this));
    };

    JBFormComponentsRegistry.prototype.unregisterAt = function(parent){
        parent.unregisterOptionsDataHandler(this.optionsDataHandler);
        parent.unregisterGetDataHandler(this.getDataHandler);
    };

    mod.factory(
        'JBFormComponentsService' ,
        [
            '$q' ,
            '$parse',
            'jbFormEvents' ,
            function($q, $parse, formEvents){
                return {
                    registryFor   : function(scope){
                        var registry = new JBFormComponentsRegistry($q, formEvents, scope);
                        return registry;
                    }
                    , registerComponent : function(scope, component){
                        scope.$parent.$emit(formEvents.registerComponent, component, scope);
                    }
                }
            }
        ]);
})();