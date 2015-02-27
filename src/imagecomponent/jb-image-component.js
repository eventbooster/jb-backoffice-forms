angular
.module( 'jb.imageComponent', [] )
.directive( 'imageComponent', [ function() {
	return {
		link				: function( scope, element, attrs, ctrl ) {
			ctrl.init( element );
		}
		, controller		: 'ImageComponentController'
		, scope				: {
			// Holds images: 
			// Existing ones with originUrl etc
			// New ones with file (js File) and fileData (FileReader.target.result)
			images			: '='
		}
		, templateUrl		: 'imageComponentTemplate.html'
	};
} ] )

.controller( 'ImageComponentController', [ '$scope', '$rootScope', function( $scope, $rootScope ) {

	var self = this
		, element;

	self.init = function( el ) {
		element = el;
		self.addEventListeners();
	};


	//
	// Active
	//

	$scope.active = undefined;
	$scope.toggleActive = function( image ) {
		if( image === $scope.active ) {
			$scope.active = undefined;
			return;
		}
		$scope.active = image;
	};





	//
	// New Files
	//
	$scope.addedImages = [];


	//
	// Remove
	//

	$scope.removeImage = function( ev, image ) {
		ev.stopPropagation();
		ev.preventDefault();
		$scope.images.splice( $scope.images.indexOf( image ), 1 );
	};




	//
	// Events (Drag/drop)
	// 

	self.addEventListeners = function() {

		// D'n'D
		addDragDropListeners();

		// Click (old school)
		addFileUploadClickListener();

	};



	/**
	* Handles click on «add» button (propagates to the file input) for strange people
	* not knowing d'n'd.
	*/
	$scope.showFileSelectDialog = function( ev ) {
		
		ev.preventDefault();
		element
			.find( 'input[type=\'file\']' )
			.click();

	};


	/**
	* User clicks «add» on file dialog
	*/
	function addFileUploadClickListener() {
		element
			.find( 'input[type=\'file\']' )
			.change( function( ev ) {
				
				handleFiles( ev.target.files );

			} );
	}


	/**
	* Handles drop
	*/
	function addDragDropListeners() {

		element
			.bind( 'drop', function( ev ) {
				ev.preventDefault();

				var files = ev.originalEvent.dataTransfer.files;
				handleFiles( files );

				return false;
			} )
			.bind( 'dragover', dragOverHandler )
			.bind( 'dragenter', dragOverHandler );
	}



	/**
	* Handles drag-over and enter
	*/
	function dragOverHandler( ev ) {
		ev.preventDefault();
		ev.originalEvent.dataTransfer.effectAllowed = 'copy';
		return false;
	}



	/**
	* Returns true if file type is supported 
	*/
	function checkFileType( file ) {
		var acceptedFileTypes = [ 'image/jpeg', 'image/png', 'image/gif' ];
		if( acceptedFileTypes.indexOf( file.type ) === -1 ) {
			return false;
		}
		return true;
	}



	/**
	* Handles files (checks type, stores them)
	*/
	function handleFiles( files ) {

		// Check file type
		var validFiles = [];
		for( var i = files.length - 1; i >= 0; i-- ) {

			if( !checkFileType( files[ i ] ) ) {
				$scope.$apply( function() {
					$rootScope.$broadcast( 'notification', {
						'type'			: 'error'
						, 'message'		: 'web.backoffice.detail.imageTypeNotSupported'
						, 'variables'	: {
							'fileName'	: files[ i ].name
							, 'fileType': files[ i ].type
						}
					} );
				} );
			}
			else {
				validFiles.push( files[ i ] );
			}
		}


		// Read file, add them to $scope (through addImage)
		for( var n = 0; n < validFiles.length; n++ ) {

			( function() {
				var validFile = validFiles[ n ];
				var fileReader = new FileReader();
				fileReader.onload = function( loadEv ) {
					addImage( loadEv.target.result, validFile );
				};
				fileReader.readAsDataURL( validFile );
			} )();

		}

	}


	/**
	* Adds an image to $scope.addedImages
	*/
	function addImage( img, file ) {
		$scope.$apply( function() {
			$scope.images.push( {
				file		: file
				, fileData	: img
			} );
		} );
	}



} ] )

.run( function( $templateCache ) {
	$templateCache.put( 'imageComponentTemplate.html',
		'<ul class=\'clearfix image-component\'>' +
			'<li><button class=\'add\' data-ng-click=\'showFileSelectDialog($event)\'>{{ \'web.backoffice.detail.imageDropZone\' | translate }}</button><input type=\'file\' multiple/></li>' +
			'<li data-ng-repeat=\'image in images\' data-ng-click=\'toggleActive(image)\' data-ng-class=\'{active: active===image}\'><img data-ng-attr-src=\'{{image.fileData}}\' data-ng-if=\'image.fileData\'/><img data-ng-attr-src=\'{{image.bucket.url}}{{image.url}}\' data-ng-if=\'image.url\'/><button class=\'remove\' data-ng-click=\'removeImage($event,image)\'>&times</button></li>' +
		'</ul>'
	);
} );