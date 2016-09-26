(function(){
    var mod = angular.module('jb.backofficeFormEvents', []);
    mod.provider('backofficeFormEvents', function BackofficeFormEventProvider(){
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

    function BackofficeSubcomponentsRegistry($q, formEvents, scope){
        this.registeredComponents = [];
        this.scope = scope;
        this.optionsDataHandlers   = [];
        this.getDataHandlers        = [];
        this.$q = $q;
        this.formEvents = formEvents;
    }

    BackofficeSubcomponentsRegistry.prototype.listen = function(){
        this.scope.$on(this.formEvents.registerComponent, function(event, component){
            console.log('REGISTRATION OF:', component);
            if(component === this) return;
            event.stopPropagation();
            this.registerComponent(component);
        }.bind(this));
        return this;
    };

    BackofficeSubcomponentsRegistry.prototype.registerComponent = function(component){
        this.registeredComponents.push(component);
        component.registerAt(this);
    };

    BackofficeSubcomponentsRegistry.prototype.getSaveCalls = function(){
        return this.registeredComponents.reduce(function(calls, component){
            return calls.concat(component.getSaveCalls());
        }, []);
    };

    BackofficeSubcomponentsRegistry.prototype.isValid = function(){
        for(var i = 0; i < this.registeredComponents.length; i++){
            if(this.registeredComponents[i].isValid() === false) return false;
        }
        return true;
    };

    BackofficeSubcomponentsRegistry.prototype.getAfterSaveTasks = function(){
        var calls = this.registeredComponents.reduce(function(subcalls, component){
            if(angular.isFunction(component.afterSaveTasks)){
                return subcalls.concat(component.afterSaveTasks());
            }
            return subcalls;
        });
        return this.$q.all(calls);
    };

    BackofficeSubcomponentsRegistry.prototype.getBeforeSaveTasks = function(){
        var calls = this.registeredComponents.reduce(function(subcalls, component){
            if(angular.isFunction(component.beforeSaveTasks)){
                return subcalls.concat(component.beforeSaveTasks());
            }
            return subcalls;
        });
        return this.$q.all(calls);
    };

    BackofficeSubcomponentsRegistry.prototype.getSelectFields = function () {
        return this.registeredComponents.reduce(function (selects, component) {
            if (angular.isFunction(component.getSelectFields)) return selects.concat(component.getSelectFields());
            if (angular.isDefined(component.select)) return selects.concat(component.select);
            return selects;
        }, []);
    };
    /**
     * @todo: make use of promises!
     * @param datasdsdf
     */
    BackofficeSubcomponentsRegistry.prototype.optionsDataHandler = function(data){
        this.optionsDataHandlers.forEach(function(handler){
            handler(data);
        });
    };

    BackofficeSubcomponentsRegistry.prototype.registerOptionsDataHandler = function(handler){
        this.optionsDataHandlers.push(handler);
    };

    BackofficeSubcomponentsRegistry.prototype.registerGetDataHandler = function(handler){
        this.getDataHandlers.push(handler);
    };

    BackofficeSubcomponentsRegistry.prototype.unregisterGetDataHandler = function(handler){
        this.getDataHandlers.splice(this.getDataHandlers.indexOf(handler), 1);
    };

    BackofficeSubcomponentsRegistry.prototype.unregisterOptionsDataHandler = function(handler){
        this.optionsDataHandlers.splice(this.optionsDataHandlers.indexOf(handler), 1);
    };

    BackofficeSubcomponentsRegistry.prototype.getDataHandler = function(data){
        this.getDataHandlers.forEach(function(handler){
            handler(data);
        });
    };

    BackofficeSubcomponentsRegistry.prototype.registerYourself = function(scope){
        (scope || this.scope).$emit(this.formEvents.registerComponent, this);
    };

    BackofficeSubcomponentsRegistry.prototype.registerAt = function(parent){
        parent.registerOptionsDataHandler(this.optionsDataHandler.bind(this));
        parent.registerGetDataHandler(this.getDataHandler.bind(this));
    };

    mod.factory(
        'backofficeSubcomponentsService' ,
        [
            '$q' ,
            'backofficeFormEvents' ,
            function($q, formEvents){
                return {
                    registryFor   : function(scope){
                        var registry = new BackofficeSubcomponentsRegistry($q, formEvents, scope);
                        return registry;
                    }
                    , registerComponent : function(scope, component){
                        scope.$emit(formEvents.registerComponent, component);
                    }
                }
            }
        ]);
})();