(function (undefined) {
  'use strict';

  /**
   * Directive for every detail view:
   * - Gets field data from server (through an OPTIONS call)
   * - Input components (text, images, relations) may register themselves
   * - Stores data on server
   *
   * Child components must/may implement the following methods:
   * - registerAt(parent) which is used to register options and get call handlers
   * - getSaveCalls: Returns POST calls (optional)
   * - isValid: Returns true if component is valid (optional)
   * - getSelectFields: Returns select fields (replaces the select property)
   */

  var _module = angular.module('jb.formComponents');
  /*
   * @todo: add a readonly mode
   * @todo: prevent the user from seeing stuff it is not able to!
   * @todo: catch 404 errors and add an error state
   * @todo: add a loader
  */
  _module.directive('jbFormView', ['$compile', function ($compile) {

    return {
      link: {
        pre: function (scope, element, attrs, ctrl) {
          if (angular.isFunction(ctrl.preLink)) {
            ctrl.preLink(scope, element, attrs);
          }
        }
        , post: function (scope, element, attrs, ctrl, transclude) {
          var errorMessage = angular.element('<h1 ng-if="$ctrl.error">{{$ctrl.error}}</h1>');
          element.addClass('jb-form-view');
          ctrl.init(scope, element, attrs);
        }

      }
      , controller        : 'DetailViewController'
      , bindToController  : true
      , controllerAs      : '$ctrl'

      /**
       * We cannot use an isolated scope here: the nested elements would be attached to the parent scope
       * and we would not be able to listen to the corresponding events.
       *
       * Otherwise we'd have to use transclusion.
       *
       *  {
         *        'entityName'  : '<'
         *      , 'entityId'    : '<'
         *      , 'isRoot'      :
         *      , 'index'       : '<'
         *      , 'isReadonly'  : '<'
         *  }
       */
      , scope: true
    };

  }]);

  _module.controller('DetailViewController',
    [
        '$scope'
      , '$rootScope'
      , '$q'
      , '$attrs'
      , '$filter'
      , '$state'
      , 'APIWrapperService'
      , 'JBFormComponentsService'
      , 'BackofficeAPIWrapperService'
      , 'JBFormViewAdapterService'
      , '$parse'
      , function ($scope, $rootScope, $q, $attrs, $filter, $state, APIWrapperService, subcomponentsService, boAPIWrapper, adapterService, $parse) {


      /**
       * Private vars
       */

      var self = this
        , element;

      self.componentsService  = subcomponentsService;
      self.componentsRegistry = null;
      self.adapterService     = adapterService;
      self.index              = 0;

            // True if all necessary values (see the corresponding promises in this.init()) were set. 
            // Once initialized, get data whenever something changes.
            self.initialized        = false;

      /**
       * Data we loaded ourselves.
       */
      self.optionData         = null;

      $scope.$watchGroup(['$ctrl.entityName', '$ctrl.entityId'], function () {
        self.setTitle();
      });

      /**
       * Set up the registry waiting for subcomponents in the pre-link phase.
       */
      self.preLink = function (scope, element, attrs) {
        self.componentsRegistry = self.componentsService.registryFor(scope);
        self.componentsRegistry.listen();
      };

      /**
       * Extracts the global entityName and entityId from the $state service.
       */
      self.parseUrl = function () {
        return {
          name: $state.params.entityName
          // Only return id if it's an ID (and not 'new'). If we return «new», a GET request will be made to /entityName/new
          ,
          id: ( $state.params.entityId && $state.params.entityId !== 'new' ) ? $state.params.entityId : false
          ,
          isNew: $state.params.entityId === 'new' ? true : false
        };

      };

      self.getEntityId = function () {
        return $scope.entityId;
      };

      self.getEntityName = function () {
        return $scope.entityName;
      };

      self.getEntityUrl = function () {
        var url = '/' + self.getEntityName();
        if (self.getEntityId()) {
          url += '/' + self.getEntityId();
        }
        return url;
      };

      /**
       * Title
       * @todo: Remove the dependency to the state in here
       */

      self.setTitle = function () {
        var   titleSuffix = self.getEntityName()
          , titlePrefix = $filter('translate')('web.backoffice.create');

        if (!self.isNew()) {
          titlePrefix = $filter('translate')('web.backoffice.edit');
          titleSuffix = titleSuffix + ' #'+ self.entityId;
        }
        $scope.title = [titlePrefix , titleSuffix].join(': ');
      };

      /**
       * Init (called from directive's link function)
       * Components of interest (old version):
       *  - data-auto-form-element
       *  - data-hidden-input
       *  - data-backoffice-tree-component
       *  - data-backoffice-relation-component
       *  - data-backoffice-component
       *  - data-backoffice-image-component
       *  - data-backoffice-image-detail-component
       *  - data-backoffice-video-component
       *  - data-backoffice-date-component
       *  - data-backoffice-media-group-component
       *  - data-backoffice-data-component
       */

      self.init = function (scope, el, attrs) {
        var   promises = []
          , element = el
          , readonlyGetter;

        /**
         * Observe these values.
         * 1. If there is no entity name and id set, load it from the state, and set the value (is the isRoot property important then?).
         * 2. If there is an entity name and no id, try to extract the primary key from the get data.
         * 3. If both are present, wait for them to be updated.
         *
         * @todo: can we detect if we are root by checking if 'registerAt' was called?
         */

        // reset the entity id passed through the scope
        // @todo: bind this shit to the controller
        self.setEntityId(undefined);

        self.isRoot             = attrs.hasOwnProperty('isRoot');
        self.restrictDelete     = attrs.hasOwnProperty('restrictDelete');
        self.hasEntityName      = attrs.hasOwnProperty('entityName');
        self.hasEntityId        = attrs.hasOwnProperty('entityId');
        self.hasReadonlyFlag    = attrs.hasOwnProperty('isReadonly');

        if(attrs.hasOwnProperty('nonInteractive')){
          self.isNonInteractive = true;
        }

        if (self.hasEntityName) {

          var   nameDeferred  = $q.defer();
          promises.push(nameDeferred.promise);
          attrs.$observe('entityName', function(newValue){
            if(!newValue) return;
            self.setEntityName(newValue);
            nameDeferred.resolve();
          });
        }

        if (self.hasEntityId) {
          var   idDeferred = $q.defer();
          promises.push(idDeferred.promise);
          attrs.$observe('entityId', function(newValue){

                            console.log('jbFormView: Entity ID changed to %o', newValue);

              if(!newValue) return;
              self.setEntityId(newValue === 'new' ? undefined : newValue);

                            // Enitty was already initialized: Get new data instantly whenever ID changes.
                            if (self.initialized) {
                                console.log('jbFormView: Entity ID changed, controller was initialized');
                                self.getData();
                            }

              idDeferred.resolve();
          });
        }
        if (!self.hasEntityName && !self.hasEntityId) {
          var stateParams = self.parseUrl();
          self.setEntityName(stateParams.name);
          self.setEntityId(stateParams.id);
        }

        if(self.hasReadonlyFlag) {
          readonlyGetter = $parse(attrs.isReadonly);
          scope.$watch(function(){
            return readonlyGetter(scope.$parent);
          }, function(value){
            if(value === true || value === false){
              self.isReadonly = value;
              if(value === true) {
                element.addClass('jb-form-readonly');
              }
            }
          });
        }


        if(!self.isRoot){
          self.adapter = self.adapterService.getAdapter(this, scope);
          self.componentsService.registerComponent(scope, self.adapter);
        }

        // @todo: store the promises otherwise and chain them as soon as the option handler is invoked (to make shure all data is available)
        $q.all(promises).then(function () {

                    self.initialized = true;

          // load option data if we are root
          // todo: switch into read only mode or display error message if we are not allowed to see the current entity
          if (self.isRoot){
            self.getOptionData()
              .then(self.checkAccessRights)
              .then(self.getData)
              .catch(function(err){
                console.error(err);
              });
          }
        });
      };

      self.isNew = function(){
        return !this.getEntityId() && this.getEntityId() !== 0;
      };

      self.checkAccessRights = function(optionData){
        return optionData;
      };

      self.setEntityName = function (name) {
        self.entityName = name;
        $scope.entityName = name;
      };

      self.setEntityId = function (id) {
        self.entityId = id;
        $scope.entityId = id;
      };

      /**
       * This is shitty! We need to load more options data as soon as we receive the options to to be able to
       * distribute options to the nested fields.
       *
       * @param fields
       */
      self.internallyHandleOptionsData = function (data) {
        self.optionData = data;
        // todo: modifying data from cache is always a dumb ass idea!
        (data.properties || []).forEach(function(property){
          property.readonly = !!(data.permissions.update === false || self.isReadonly);
        });

        return self.componentsRegistry.optionsDataHandler(data);
      };

      self.getOptionsData = function(){
        return self.getOptionData();
      };

      self.getSpecFromOptionsData = function(data) {
        var relations = (data && data.relations && data.relations.length) ? data.relations : [];
        for(var i = 0; i < relations.length; i++){
          var relation = relations[i];
          if(relation.remote.resource === this.entityName) return relation;
        }
      };

      /**
       * OPTION data
       */
      self.getOptionData = function () {
        console.log('DetailView: Make OPTIONS call for %o', self.getEntityName());
        return self
          .makeOptionRequest('/' + self.getEntityName())
          .then(
              self.internallyHandleOptionsData
            , function (err) {
              $rootScope.$broadcast('notification', {
                  'type': 'error'
                , 'message': 'web.backoffice.detail.optionsLoadingError'
                , variables: {errorMessage: err}
              });
            });
          };

      /**
       * Makes options call, sets self.fields
       * @todo: check if the fields are used somewhere
       */
      self.makeOptionRequest = function (url) {
        return APIWrapperService.getOptions(url);
      };

      /**
       * Use the events for that.
       */
      self.register = function (el) {
        throw new Error('DEPRECATED');
      };

      self.registerComponent = function(component){
        this.componentsRegistry.registerComponent(component);
      };

      /**
       * Collects the select fields of all the registered subcomponents. This is the internal API.
       * @returns {Array}
       */
      self.getSelectParameters = function () {
        return [this.getOwnIdField()].concat(self.componentsRegistry.getSelectFields());
      };

      /**
       * Distributes the entity data (from the GET call) to the registered subcomponents by delegating
       * to the getDataHandler of the registry.
       */
      self.distributeData = function (data) {
                console.log('jbFormView: Distribute data %o', data);
                if (!data) data = {};
        self.componentsRegistry.getDataHandler(data);
      };

      /**
       * Make a GET request to the API, selecting all the fields the subcomponents request.
       */
      self.getData = function () {
        return self
          .makeGetRequest()
          .then(
          self.distributeData
          , function (err) {
            // debugger;
            // @todo: if the entity is not available or the user is not able to access the entity we get a 404 (due to the tenant restriction)
            // if(err.statusCode)
            self.error = 'Unable to load!!';
            $rootScope.$broadcast('notification', {
                type      : 'error'
              , message   : 'web.backoffice.detail.loadingError'
              , variables : {
                errorMessage: err
              }
            });
          });

      };

      /**
       * Get data for current entity from server, fire dateUpdate. Done after changes were saved.
       */
      self.updateData = function () {
        return self.getData();
      };


      /**
       * Gets current entity's data through GET call
       */
      self.makeGetRequest = function () {

        var url     = self.getEntityUrl();
        var select  = self.getSelectParameters();
        var selectHeader = self.concatSelectParameters(select);

        console.log('DetailView: Get Data from %o with select %o', url, select);
        if(self.isNew()) return $q.when();
        return APIWrapperService.request({
          url: url
          , headers: {select: selectHeader}
          , method: 'GET'
        }).then(
          function (data) {
            return data;
          }.bind(this)
          , function (err) {
            return $q.reject(err);
          });

      };

      self.concatSelectParameters = function(parameters){
        var fieldMap = (parameters || []).reduce(function(fields, field){
          fields[field] = true;
        }, {});
        return Object.keys(fieldMap)
      };

      ///////////////////////////////////////////////////////////////////////////////////////////////
      //
      // Save
      //
      $scope.edit = function(){
        $state.go('app.detail', {
            entityName    : self.getEntityName()
          , entityId      : self.isNew() ? 'new' : self.getEntityId()
        });
      };
      /**
       * Called when user clicks 'save'. Can be called manually through scope().
       *
       * @param <Boolean> dontNotifyOrRedirect            If true, no notification is shown and on successful creation, user is
       *                                                _not_ redirected to the new entity. Needed for manual saving.
       * @returns <Integer>                            ID of the current entity
       */
      $scope.save = function (ev, dontNotifyOrRedirect, callback) {

        // Needed for nested detailViews: We don't want to propagate the save event to the parent detailView
        // See e.g. article in CC back office
        if (ev && angular.isFunction(ev.preventDefault)) {
          ev.preventDefault();
          ev.stopPropagation();
        }

        // We need to get the saved entity's id so that we can redirect the user to it
        // after it has been created (when user was on /entity/new)
        // Can't be returned, as we're using promises. Therefore pass an object to the save
        // call that will be filled with the id
        /*var returnValue = {
         id: undefined
         };*/
        if(self.isReadonly) return;
        return self
          .makeSaveRequest()
          .then(function (entityId) {
            // Entity didn't have an ID (was newly created): Redirect to new entity
            if (self.parseUrl().isNew && !dontNotifyOrRedirect) {
              $state.go('app.detail', {entityName: self.getEntityName(), entityId: self.getEntityId()});
            }
            // Do notify and redirect
            if (!dontNotifyOrRedirect) {
              console.log('DetailViewController: Show success message on %o', $rootScope);
              $rootScope.$broadcast('notification', {
                type: 'success'
                , message: 'web.backoffice.detail.saveSuccess'
              });
            }
            else {
              console.log('DetailViewController: Don\'t show any message or redirect');
            }

            self.updateData();

            if (callback) callback();

            return entityId || null;


          }).catch(function(err) {

              $rootScope.$broadcast('notification', {
                type: 'error'
                , message: 'web.backoffice.detail.saveError'
                , variables: {
                  errorMessage: err.message
                }
              });

              return $q.reject(err);
          });

      };

      self.isValid = function () {
        return self.componentsRegistry && self.componentsRegistry.isValid()
      };
      /**
       * Stores all component's data on server
       */
      self.makeSaveRequest = function (ignoreReadonly) {
        if (!self.isValid()) return $q.reject(new Error('Not all required fields filled out.'));
        if(self.isReadonly && ignoreReadonly !== true) return $q.when(self.getEntityId());

        // Pre-save tasks (upload images)
        return self.executePreSaveTasks()

          // Save stuff on current entity
          .then(function (entity) {
            // current entity state
            return self.makeMainSaveCall();
          })
          .then(function (id) {
            return self.executePostSaveTasks(id);
          });

      };

      /**
       * Executes tasks that must be done before the current entity is saved, i.e.
       * create all entities that will be linked to this entity afterwards, like e.g.
       * upload an image
       * Calls beforeSaveTasks on registered components. They must return a promise.
       */
      self.executePreSaveTasks = function () {
        var entity  = {};
        entity.meta = {};
        return self.componentsRegistry.getBeforeSaveTasks(entity);
      };
      /**
       * This is the external api!
       * @todo: move this to the relation strategy
       */
      self.beforeSaveTasks = function(entity){
        var task = self.makeSaveRequest();
        return task;
      };

      /**
       * Executes save tasks that must be executed after the main entity was created,
       * e.g. save the order of images in a mediaGroup:
       * 1. Save main entity (done through regular save call)
       * 2. Update media links (/mediumGroup/id/medium/id) (done through regular save call)
       * 3. Update order (GET all media from /mediumGroup, then set order on every single relation)
       */
      self.executePostSaveTasks = function (id) {
        return self.componentsRegistry.getAfterSaveTasks(id);
      };

      /**
       * @todo: make this more abstract and safe
       * @param optionsData
       * @returns {*}
       */
      self.getIdFieldFrom = function(optionsData){
        return (optionsData && optionsData.primaryKeys) ? optionsData.primaryKeys[0] : null;
      };

      self.getOwnIdField = function(){
        return this.getIdFieldFrom(this.optionData);
      };

      self.getOwnId = function(data) {
        var primaryKey;
        if(!data) return null;
        primaryKey = this.getOwnIdField();
        return primaryKey ? data[primaryKey] : null;
      };
      /**
       * Saves:
       * - first, the data on the entity (creates entity, if not yet done)
       *   by doing all calls going to /
       * - second, all other things (e.g. relations that need the entity to be
       *   existent)
       * @return Promise        Parameter passed is null or mainEntity's id
       *
       * @todo: pre save tasks should create related entities and set the relation id (hasOne) (or set the field values)
       * @todo: the main call should only save/create the current entity
       * @todo: the post save tasks should create relations having access to the previously saved id (store it into a meta parameter)
       */
      self.makeMainSaveCall = function () {

        var calls = self.generateSaveCalls();

        console.log('DetailView: Save calls for %o are %o', this.entityName, calls);

        var mainCall
          , relationCalls = []
          , mainCallData;

        // Split calls up in mainCall, needs to be done first
        // (main entity needs to be created before relations can be set)
        // Main calls start with /entityName or /entityName/entityId (for updates)
        // /entityName/entityId must be covered in case of redirects. Subsequent calls
        // to releations must be made to the new entityId.
        for (var i = 0; i < calls.length; i++) {

          // If url is an object it should never be a call to the mainEnity (as mainEntity: append or prepend will be
          // used and therefore a relation be created.
          if (
            !angular.isObject(calls[i].url) &&
            (
              !calls[i].url ||
              calls[i].url.indexOf('/' + self.getEntityName()) === 0
            )
          ) {
            mainCall = calls[i];
          }

          else {
            relationCalls.push(calls[i]);
          }

        }
        // entityId not yet set: New element – but has no fields or no required fields,
        // therefore no information might be provided, except for some relations.
        // If entity is not generated (what would happen as there's no data to store),
        // relations could not be created (POST to /entityName/otherEntityName/otherEntityId)
        // would fail, as entityId doesn't exist.
        if (!mainCall && !self.getEntityId()) {
          mainCall = {
            method: 'POST'
            , url: '/' + self.getEntityName()
          };
        }

        console.log('DetailView: Main save call is %o, other calls are %o', mainCall, relationCalls);
        var id = null;
        // Make main call
        return self.executeSaveRequest(mainCall)

          // Make all secondary calls (to sub entities) simultaneously
          .then(function (mainCallResult) {

            // Make mainCallData available to next promise
            mainCallData = mainCallResult;

            console.log('DetailView: Made main save call; got back %o', mainCallData);
            // Pass id of newly created object back to the Controller
            // so that user can be redirected to new entity
            id = self.getOwnId(mainCallData);
            if(id){
              console.log('DetailView: Entity id is %o', id);
              self.setEntityId(id);
            }

            var callRequests = [];
            relationCalls.forEach(function (call) {
              callRequests.push(self.executeSaveRequest(call));
            });

            return $q.all(callRequests);

          })

          // Make sure we pass back the id.
          .then(function () {
            return self.getEntityId();
          });


      };


      /**
       * Adds the call componentCall gotten from a registered component to the
       * calls variable that's sorted by urls and methods.
       * Therefore, if multiple calls to the same url exists, it groups them together
       * by an array item on calls and composes the data.
       */
      self.addCall = function (componentCall, calls) {

        // Components may pass back just a data field – means that it's stored on the entity itself.
        // Get url from self.getEntityUrl, as it is needed to determine the method of the call
        // (PATCH or POST).
        if (!componentCall.url) {
          componentCall.url = self.getEntityUrl();
        }

        // Method's missing
        if (!componentCall.method) {

          // Test if URL has an ID (ends with /12329)
          // If it does, use patch, else post.
          if (/\/\d*\/?$/.test(componentCall.url)) {
            componentCall.method = 'PATCH';
          }
          else {
            componentCall.method = 'POST';
          }
        }

        // Check if call to url does already exit
        var call = this.getSaveCall(calls, componentCall.method, componentCall.url);

        // If componentCall has headers, treat it as a different call. To improve, we might
        // compare headers, but let's save that for better times.
        // Headers are e.g. used in treeFormData to store a tree (needs Content-Type: application/json)
        if (componentCall.hasOwnProperty('headers')) {
          call = false;
        }

        // Call doesn't yet exist
        if (!call) {
          call = {
            method: componentCall.method
            , url: componentCall.url
            , data: componentCall.data
            , headers: componentCall.headers || {}
          };
          calls.push(call);
        }

        // Add data
        else {

          // Don't do that if we're sending a string or array (e.g. when using application/json as Content-Type
          if (componentCall.data) {
            for (var p in componentCall.data) {
              call.data[p] = componentCall.data[p];
            }
          }

        }

      };


      /**
       * Check if a call to method and url does already exist in calls. If it does, return it,
       * else return false
       * @param <Array> calls            Array of calls
       * @pparam <String> method
       * @param <String> url
       */
      self.getSaveCall = function (calls, method, url) {

        // Default: empty array, if not found
        var saveCall = false;
        calls.some(function (call) {
          // Check if URL is the same. Normally use === comparator.
          // But if URL is not set, it might be false or '', therefore
          // use == comparator.
          var sameUrl = call.url === url || ( !call.url && !url )
            , sameMethod = call.method.toLowerCase() === method.toLowerCase();
          if (sameMethod && sameUrl) {
            saveCall = call;
            return true;
          }
        });
        return saveCall;

      };


      /**
       * Makes POST or PATCH call to server to store data.
       * @param <Object> data            Key: URL to be called
       *                                Value: Data to be sent
       * @param <String> basePath        The current entity's path (e.g. /event/18),
       *                                needed to generate calls to relative URLs
       * @return <Promise>                Promise of the corresponding call
       */
      self.executeSaveRequest = function (call) {

        // Empty call (if there's no call to / to be made, e.g.)
        // Just resolve the promise
        if (!call) {
          console.log('DetailView: No call to be made');
          return $q.when(call);
        }

        // url
        // - Take current url + url, if it's relative (doesn't start with a /)
        // - Take url if it's absolute (starts with a /)
        var url;


        //
        // Generate final URL
        //


        // Object

        if (angular.isObject(call.url)) {

          // url.path missing – needs to be set if url is an object
          if (!call.url.path) {
            console.error('DetailViewController: url property is missing on path on %o', call);
            return $q.reject('Got invalid call data, path property missing on url for ' + JSON.stringify(call));
          }

          // entityName/entityId or entityName
          var mainEntityUrl = self.getEntityId() ?
          self.getEntityName() + '/' + self.getEntityId() :
            self.getEntityName();

          // Remove trailing and leading slashes
          var path = call.url.path.replace(/^\/*/, '').replace(/\/*$/, '');

          if (call.url.mainEntity === 'prepend') {

            url = '/' + mainEntityUrl + '/' + path;

          }
          else if (call.url.mainEntity === 'append') {

            url = '/' + path + '/' + mainEntityUrl;

          }

          else {
            url = call.url.path;
          }

        }

        // absolute
        else if (call.url && call.url.indexOf('/') === 0) {

          url = call.url;

        }


        // Relative URL

        else {

          url = '/' + self.getEntityName();

          // Only use entity's ID if it exists (i.e. we're not newly creating an entity)
          if (self.getEntityId()) {
            url += '/' + self.getEntityId();
          }

          // Append call.url, if available
          if (call.url) {
            url += '/' + call.url;
          }

        }

        console.log('DetailView: Make %s call to %s with %o. Call is %o, entityName is %o.', call.method, url, call.data, call, self.getEntityName());

        // Add datasourceId as long as it's needed
        // #todo remove when eE's ready
        if (!call.data) {
          call.data = {};
        }

        return APIWrapperService.request({
          url: url
          , data: call.data
          , method: call.method
          , headers: call.headers
        });

      };


      /**
       * Goes through all inputs, collects their save calls (by calling getSaveCalls)
       *
       * getSaveCalls() may return:
       * - false (no call to be made)
       * - an array of objects or single object, where each object has the following properties
       *     - url (mandatory): URL to be called as
       *           - a <String>: If prefixed with a /, will be an absolute path, else relative to the
       *             current entity
       *           - an <Object> with the properties
       *                   - path <String>: path
       *                   - baseEntity <String> 'append|prepend' Whether and where to append
       *                     the current entity plus its ID. If not set or another value,
       *                     current entity is not used at all.
       *     - method (mandatory, <String>): method to be used (GET,PATCH,POST)
       *     - headers (optional, <Object>): an object of headers, e.g. { range: '0-10' }
       *     - data (optional <Object>): data to be sent with a POST or PATCH request
       * - a Promise
       */
      self.generateSaveCalls = function () {
        if(self.isReadonly) return [];
        var saveCalls = self.componentsRegistry.getSaveCalls().reduce(function (calls, componentCalls) {
          self.addCall(componentCalls, calls);
          return calls;
        }, []);
        return saveCalls;
      };


      ///////////////////////////////////////////////////////////////////////////////////////////////
      //
      // DELETE
      //
      self.unlink = function(){
        return $scope.$destroy();
      };

      $scope.$on('reloadViewData', function(event){
        if(self.isRoot){
          console.info('reloadView');
          event.stopPropagation();
          self.getData();
        }
      });

      /**
       * Deletes the entity.
       * @todo: the redirection should not be a matter of the detail-view itself, if we have nested detail
       * todo: let the adapter do the delete requests it is aware of the context of the entity and can trigger all the delete requests correctly
       * @param <Boolean> nonInteractive        True if user should not be redirected to main view
       */
      $scope.delete = function (event, nonInteractive, refreshView) {
        if(event){
          event.preventDefault();
          event.stopPropagation();
        }
        console.log('DetailView: Delete');

        var   confirmed         = false
          , interactive       = !(angular.isDefined(self.isNonInteractive) ? self.isNonInteractive : nonInteractive)
          , confirmMessage    = $filter('translate')('web.backoffice.detail.confirmDeletion');

        if(self.restrictDelete && !self.isRoot){
          return $scope.$emit('deletedDetailView', self);
        }

        confirmMessage += '\n'+self.getEntityName() + '('+self.getEntityId()+')';
        confirmed = confirm(confirmMessage);

        if (!confirmed) {
          return;
        }
        if(self.isNew() && !self.isRoot){
          return $scope.$emit('deletedDetailView', self);
        }
        return self
          .makeDeleteRequest()
          .then(function (data) {
            if(!self.isRoot){
               $scope.$emit('deletedDetailView', self);
            }
            $scope.$emit('notification', {
                type      : 'success'
              , message   : 'web.backoffice.detail.deleteSuccess'
            });

            if (interactive) {
              return $state.go('app.list', {entityName: self.getEntityName() });
            }

            if(refreshView){
              $scope.$emit('reloadViewData');
            }

          }, function (err) {
            $scope.$emit('notification', {
              type      : 'error'
              , message   : 'web.backoffice.detail.deleteError'
              , variables : {
                errorMessage: err
              }
            });
            return $q.reject(err);
          });
      };


      /**
       * Delete an entity
       *
       * todo: only delete the entity directly if it is a root entry, otherwise delegate it to the adapter!
       */
      self.makeDeleteRequest = function () {
        if(self.isReadonly) return $q.when();
        console.log('DetailView: Make DELETE request');
        return APIWrapperService.request({
            url: '/' + self.getEntityName() + '/' + self.getEntityId()
            , method: 'DELETE'
        });

      };

    }]);
})();