/**
* As a tree is a simple relation on the entity it belongs to, we have to create a component
* that is not initialized through auto-form
*/
angular
.module( 'jb.formComponents' )
.directive( 'jbFormTreeComponent', [ function() {

	return {

		  controller		: 'JBFormTreeComponentController'
		, link				: function( scope, element, attrs, ctrl ) {
			ctrl.init(scope, element);
		}
		, templateUrl		: 'treeTemplate.html'
		, scope				: {
			// Filter: When making GET call, filter is applied, e.g id_menu=5. Is needed if 
			// the nested set is grouped (e.g. menuItems might be grouped by menu). 
			// If data is stored, filter is passed through POST call to the server; 
			// { id: 5, children[ { id: 2 } ] } becomes { id: 5, id_menu: 3, children[ { id: 2, id_menu: 3 } ] }
            // @todo: this might not be working due to the isolated scope
			  //filter	    : '=treeComponentFilter'
			labelName		: '@treeComponentLabel'
			, entityName	: '@for'
			, maxDepth		: '@'
		}
		, bindToController	: true
		, controllerAs		: 'treeComponentController'
	};

} ] )


.controller( 'JBFormTreeComponentController', [
          '$scope'
        , '$rootScope'
        , '$attrs'
        , '$location'
        , '$q'
        , 'APIWrapperService'
        , 'JBFormComponentsService'
        , function( $scope, $rootScope, $attrs, $location, $q, APIWrapperService, componentsService ) {

	var self			= this
		, element
		, detailViewController
		, maxDepth		= $attrs.maxDepth || 10;

	self.dataTree		= undefined;

	
	if( !self.labelName || !self.entityName ) {
		console.warn( 'JBFormTreeComponentController: labelName or entityName (for) attribute missing' );
	}


	/**
	* Called when user clicks pencil on a list item 
	*/
	self.editEntity = function( ev, id ) {
		
		ev.preventDefault();
		$location.path( '/' + $attrs.for + '/' + id );

	};


	// Called by link function
	self.init = function( scope, el, detViewCtrl ) {

		element					= el;
		componentsService.registerComponent(scope, self);

	};



    /*
     * @todo: check what we need!
     */
    self.registerAt = function(parent){
        //parent.registerOptionsDataHandler(self.handleOptionsData);
        parent.registerGetDataHandler(self.handleGetData);
    };


    /**
    * We don't really need handleGetData – just use it to get the other data we need.
    * data relates to the menu – use the menu's id get menuItems from this menu
    */ 
    self.handleGetData = function(data) {
    	self.data = data;
    	self.getData(data && data.id? data.id : undefined);
    };


    self.isValid = function() {
    	return true;
    };


	/**
	* If we get data through the detailViewController (self.select/registerGetDataHandler)
	* we can't pass a range argument. The menu might be much longer!
	*/
	self.getData = function(menuId) {

		// No menu ID: We're in the 'new' mode. Don't get any data.
		if (!menuId) return;

		// Create headers
		var headers = {
			range		: '0-1000'
		};

		console.log('JBFormTreeComponentController: filter items for menuId %o', menuId);

		/*if( self.filter ) {
			var filter = '';
			for( var i in self.filter ) {
				filter = i + '=' + self.filter[ i ];
			}
			headers.filter = filter;
		}*/
		headers.filter = 'id_menu=' + menuId;

		// Make GET request
		APIWrapperService.request( {
			method			: 'GET'
			, url			: '/' + self.entityName
			, headers		: headers
		} )
		.then( function( data ) {
			self.updateData( data );

		}, function( err ) {
			$rootScope.$broadcast( 'notification', {
				type				: 'error'
				, message			: 'web.backoffice.detail.loadingError'
				, variables			: {
					errorMessage	: err
				}
			} );
		} );

	};





	/**
	* Listens for data gotten in getData
	*/
	self.updateData = function( data ) {

		console.log('JBFormTreeComponentController: data is %o', data);

		self.dataTree = getTree( data );
		console.log( 'JBFormTreeComponentController: dataTree is %o', self.dataTree );

		// Wait for template to be rendered
		setTimeout( function() {
		
			// Add class required for jQuery plugin			
			element.addClass( 'dd' );
			// Add jQuery plugin
			element.nestable( {
				dragClass				: 'dd-dragelement'
				, placeClass			: 'dd-placeholder'
				, maxDepth				: self.maxDepth
			} );

		}, 500 );
		
	};






	/**
	* Returns data to be stored. There's a special JSON POST call available to store a tree. 
	*/
	self.getSaveCalls = function() {

		// When we're in the 'new' mode, don't store tree as it does not exist
		if (!self.data || !self.data.id) return [];
		
		var treeData = element.nestable( 'serialize' );
		console.log( 'JBFormTreeComponentController: Store data %o', treeData );

		var cleanedTreeData = self.cleanTreeData( treeData, self.data.id );
		console.log( 'JBFormTreeComponentController: Cleaned data %o, got %o', treeData, cleanedTreeData );

		return {
			method				: 'POST'
			, headers			: {
				'Content-Type'	: 'application/json'
			}
			, url				: '/' + self.entityName
			, data				: cleanedTreeData
		};

	};




	/**
	* nestable('serialize') returns data with a lot of junk on it – remove it and only leave
	* the properties «id» and «children» left. Recurive function.
	* originalTreeData, as serialized by nestable('serialize') is an object with keys 0, 1, 2, 3… 
	* and not an array.
	*/
	self.cleanTreeData = function( originalTreeData, menuId, cleaned ) {

		if( !cleaned ) {
			cleaned = [];
		}

		for( var i in originalTreeData ) {

			var branch = originalTreeData[ i ];

			var cleanBranch = {};
			cleanBranch.id = branch.id;
			// See https://github.com/joinbox/eventbooster-issues/issues/708
			cleanBranch.id_menu = menuId;

			// If filter was set, add it to the data that will be sent to the server. 
			if( self.filter ) {

				for( var j in self.filter ) {
					cleanBranch[ j ] = self.filter[ j ];
				}

			}

			console.error(originalTreeData, cleanBranch);

			// Children: Recursively call cleanTreeData
			if( branch.children ) {
				cleanBranch.children = [];
				self.cleanTreeData( branch.children, menuId, cleanBranch.children );
			}

			cleaned.push( cleanBranch );

		}

		return cleaned;

	};









	/* https://github.com/joinbox/eb-service-generics/blob/master/controller/MenuItem.js */
    var getTree = function(rows) {

        var rootNode = {};

        // sort the nodes
        rows.sort(function(a, b) {return a.left - b.left;});

        // get the tree, recursive function
        buildTree(rootNode, rows);

        // return the children, the tree has no defined root node
        return rootNode.children;

    };


    var buildTree = function(parentNode, children) {
        var   left          = 'left'
            , right         = 'right'
            , nextRight     = 0
            , nextChildren  = []
            , parent;

        if (!parentNode.children) {parentNode.children = [];}

        children.forEach(function(node) {
            if (node[right] > nextRight) {
                // store next rigth boundary
                nextRight = node[right];

                // reset children array
                nextChildren = [];

                // add to parent
                parentNode.children.push(node);

                // set as parent
                parent = node;
            }
            else if (node[right]+1 === nextRight) {
                nextChildren.push(node);

                // rcursiveky add chuildren
                buildTree(parent, nextChildren);
            }
            else { nextChildren.push(node);}
        });
    };



} ] )




// Base template: create data-tree-form-element-list
.run( function( $templateCache ) {

	$templateCache.put( 'treeBranchTemplate.html',
		'<div class=\'dd-handle\'>' +
			'<span data-ng-if=\'branch[ treeComponentController.labelName ]\'>{{ branch[ treeComponentController.labelName ] }}</span>' +
			'<span data-ng-if=\'!branch[ treeComponentController.labelName ]\'>N/A</span>' +
		'</div>' +
		'<button class=\'fa fa-pencil btn btn-link edit\' data-ng-click=\'treeComponentController.editEntity($event,branch.id)\'></button>' +
		'<ol data-ng-if=\'branch.children\' class=\'dd-list\'>' +
			'<li data-ng-repeat=\'branch in branch.children\' data-ng-include=\'"treeBranchTemplate.html"\' class=\'dd-item\' data-id=\'{{ branch.id }}\'>' +
			'</li>' +
		'</ol>'
	);

	$templateCache.put( 'treeTemplate.html',
		'<ol class=\'dd-list\'>' +
			'<li data-ng-repeat=\'branch in treeComponentController.dataTree\' data-ng-include=\'"treeBranchTemplate.html"\' class=\'dd-item\' data-id=\'{{ branch.id }}\'>' +
			'</li>' +
		'</ol>'
	);

} );