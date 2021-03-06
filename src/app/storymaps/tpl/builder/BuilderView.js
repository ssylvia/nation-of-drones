define(["lib-build/tpl!./BuilderView",
        "lib-build/css!./BuilderView",
		"lib-build/css!./Common",
		"../core/WebApplicationData", 
		"storymaps/common/builder/settings/SettingsPopup",
		"storymaps/common/builder/Landing",
		"./Help",
		"./InitPopup",
		"storymaps/common/builder/SharePopup",
		"../core/Helper",
		"storymaps/common/utils/CommonHelper",
		// Settings tab
		"storymaps/common/builder/settings/ViewLayoutVertical",
		"./settings/ViewLayoutOptions",
		"./settings/ViewMapOptions",
		"storymaps/common/builder/settings/ViewTheme",
		"storymaps/common/builder/settings/ViewHeader",
		// Template
		"./addedit/Popup",
		"./OrganizePopup",
		// Utils
		"dojo/Deferred",
		"dojo/topic",
		"dojo/has",
		// Text editing lib is loaded here once for the whole app
		"lib-app/ckeditor/ckeditor",
		// Include the dep in the build
		"storymaps/tpl/builder/InlineEditor"
	], 
	function (
		viewTpl,
		viewCss,
		commonCss,
		WebApplicationData, 
		SettingsPopup,
		Landing,
		Help,
		InitPopup, 
		SharePopup,
		Helper,
		CommonHelper,
		// Settings tab
		ViewLayout, 
		ViewLayoutOptions,
		ViewMapOptions,
		ViewTheme, 
		ViewHeader,
		// Template
		AddEditPopup,
		OrganizePopup, 
		// Utils
		Deferred,
		topic,
		has
	){
		return function BuilderView(Core) 
		{
			$("#builder-views").append(viewTpl({ }));
			
			var _this = this,
				_settingsPopup = null,
				_landingUI = new Landing($("#builderLanding"), firstAdd, clickHelp),
				_helpUI = new Help($("#builderHelp")),
				_initPopup = new InitPopup($("#initPopup")),
				_sharePopup = new SharePopup($('#sharePopup')),
				_addEditPopup = new AddEditPopup($('#addEditPopup')),
				_organizePopup = new OrganizePopup($('#organizePopup'));

			this.init = function(settingsPopup)
			{
				_settingsPopup = settingsPopup;
				
				topic.subscribe("SETTINGS_POPUP_SAVE", settingsPopupSave);
				topic.subscribe("OPEN_HELP", function(){ _helpUI.show(); });
				topic.subscribe("story-update-entries", updateAddButtonStatus);
				
				topic.subscribe("BUILDER-UPDATE-ENTRY-DESCRIPTION", persistDescription);
				
				/*
				topic.subscribe("ADDEDIT_LOAD_FIRST_WEBMAP_SYNC", function(webmapId){
					var handle = topic.subscribe("story-loaded-map", function(params){
						console.log("ADDEDIT_LOAD_FIRST_WEBMAP_SYNC", app.mapItem.item.extent)
						if ( webmapId == params.id ) {
							WebApplicationData.setSeriesExtent(JSON.stringify(app.mapItem.item.extent));
						}
						handle.remove();
					});
				});
				
				topic.subscribe("ADDEDIT_DEFINE_FIRST_WEBMAP_SYNC_EXTENT", function(extent){
					console.log("ADDEDIT_DEFINE_FIRST_WEBMAP_SYNC_EXTENT", extent)
					WebApplicationData.setSeriesExtent(JSON.stringify(extent));
				});
				*/
				
				app.builder.openSharePopup = openSharePopup;
				app.builder.openEditPopup = openEditPopup;
				app.builder.openHelpPopup = openHelpPopup;
				
				CKEDITOR.disableAutoInline = true;
				
				// Add buttons for all layouts
				$(".builder-add")
					.click(function(){ 
						if (! $(this).hasClass("disabled"))
							clickAdd(); 
					})
					.find(".builder-lbl").html(i18n.builder.addEditPopup.lblAdd);
				
				// Organize buttons for all layouts
				$(".builder-organize")
					.click(openOrganizePopup)
					.find(".builder-lbl").html(i18n.builder.organizePopup.title);
				
				app.builderCfg = {
					STATUS: {
						PUBLISHED: i18n.builder.common.lblStatus1,
						HIDDEN: i18n.builder.common.lblStatus3
					}
				};
				
				//
				// Layout localization
				//
				
				app.cfg.LAYOUTS[0].title = i18n.builder.layouts.tabTitle;
				app.cfg.LAYOUTS[0].description = i18n.builder.layouts.tabDescr;
				app.cfg.LAYOUTS[1].title = i18n.builder.layouts.sideTitle;
				app.cfg.LAYOUTS[1].description = i18n.builder.layouts.sideDescr;
				app.cfg.LAYOUTS[2].title = i18n.builder.layouts.bulletTitle;
				app.cfg.LAYOUTS[2].description = i18n.builder.layouts.bulletDescr;
				
				//
				// Layout specificity related to handling events
				//
				$('body').on('shown.bs.modal', '.modal', function (e) {
					if( WebApplicationData.getLayoutId() == "float" )
						app.ui.floatingPanel.disableSwiperKeybordEvent();
						
				});
				
				$('body').on('hide.bs.modal', '.modal', function (e) {
					if( WebApplicationData.getLayoutId() == "float" ) {
						if ( $(e.currentTarget).hasClass("addEditPopup") && $(e.currentTarget).hasClass("temporaryHide") )
							return;
					
						app.ui.floatingPanel.enableSwiperKeybordEvent();
					}
				});
			};
			
			this.appInitComplete = function()
			{
				if ( ! app.isProduction && CommonHelper.getUrlParams().debug == "add" )
					clickAdd();
				
				if ( ! app.isProduction && CommonHelper.getUrlParams().debug == "organize" )
					openOrganizePopup();
				
				if ( ! app.isProduction && CommonHelper.getUrlParams().debug == "settings" )
					this.openSettingPopup();
				
				if ( ! app.isProduction && CommonHelper.getUrlParams().debug == "edit" )
					openEditPopup({
						displayTab: CommonHelper.getUrlParams().debugView || "content" ,
						sectionIndex: CommonHelper.getUrlParams().debugIndex || 0 
					});
				
				updateAddButtonStatus();
			};
			
			this.updateUI = function(forceStoryLength)
			{
				var storyLength = forceStoryLength || app.data.getStoryLength();
				$(".builder-add, .builder-organize").removeClass("active");
				
				_landingUI.toggle(! storyLength);
				$(".builder-content-panel").toggle(!! storyLength);
				$("#sidePanel .builder, #floatingPanel .builder").toggleClass("large", ! app.data.getStoryLength());
			};
			
			//
			// Add
			//
			
			function firstAdd(title)
			{
				_this.updateUI(true);
				$(".builder-add").addClass("active");	
				
				WebApplicationData.setTitle(title);
				topic.publish("CORE_UPDATE_UI");
				
				clickAdd();
			}
			
			function clickAdd()
			{
				_this.updateUI(true);
				$(".builder-add").addClass("active");
				
				_addEditPopup.present({ 
					mode: "add",
					webmaps: app.data.getWebmapsInfo(),
					entry: app.data.getCurrentSection(),
					layout: WebApplicationData.getLayoutId()
				}).then(
					function(section){
						console.log('builder.BuilderView.clickAdd:', section);
						
						$("body").removeClass("isBuilderLanding");
						app.isInitializing = false;
						
						app.data.addStorySection(section);
						
						checkForTemporaryMaps(section);
						
						topic.publish("story-update-entries");
						topic.publish("BUILDER_INCREMENT_COUNTER", 1);
						
						// After first section added - placement of Add/Orga - TODO remove after title optimization
						topic.publish("CORE_RESIZE");
					},
					function(){
						checkForTemporaryMaps();
						_this.updateUI();
					}
				);
			}
			
			function updateAddButtonStatus()
			{
				var disableAddButton = app.data.getStoryLength() >= app.cfg.MAX_NB_ENTRIES;
				
				$(".builder-add")
					.toggleClass("disabled", disableAddButton)
					.tooltip(disableAddButton ? {
						trigger: 'hover',
						placement: 'top',
						html: true,
						title: i18n.builder.addEditPopup.disabled
					} : 'destroy');
				
				/*
				if ( disableAddButton ) {
					var appColors = WebApplicationData.getColors();
					CommonHelper.addCSSRule(".builder-content-panel .tooltip-inner { background-color: " + appColors.text + "; color: " + appColors.panel + "; }");
					CommonHelper.addCSSRule(".builder-content-panel .tooltip-arrow { border-top-color: " + appColors.text + " !important; }");
				}
				*/
			}
			
			/*
			 * Remove the potential maps that have been loaded in Add/Edit but discarded
			 */  
			function checkForTemporaryMaps(section)
			{
				var sectionIsWebmap = section && section.media && section.media.webmap;
				
				if ( sectionIsWebmap ) 
					$('.mapContainer[data-webmapid="' + section.media.webmap.id + '"]').data('temporary', false);
				
				$('.mapContainer').filter(function() { 
					return $(this).data("temporary");
				}).each(function(i, node){
					var webmapId = $(node).data('webmapid');
					
					app.maps[webmapId].response.map.destroy();
					delete app.maps[webmapId];
					
					if ( $(node).parent().hasClass("active") )
						app.map = null;
					
					$(node).parent().remove();
				});
			}
			
			//
			// Edit
			//
			
			function openEditPopup(cfg)
			{
				var popupDeferred = new Deferred();
				
				_addEditPopup.present({
					mode: "edit",
					displayTab: cfg.displayTab,
					webmaps: app.data.getWebmapsInfo(),
					entry: app.data.getStoryByIndex(cfg.entryIndex),
					entryIndex: cfg.entryIndex,
					layout: WebApplicationData.getLayoutId()
				}).then(
					function(updatedSection) {
						app.data.editSection(cfg.entryIndex, updatedSection);
						
						checkForTemporaryMaps(updatedSection);
						
						topic.publish("story-update-entry", {
							index: cfg.entryIndex,
							section: updatedSection
						});
						topic.publish("BUILDER_INCREMENT_COUNTER", 1);
						popupDeferred.resolve();
					},
					function(){
						checkForTemporaryMaps();
					}
				);
				
				return popupDeferred;
			}
			
			//
			// Inline Editing
			//
			
			function persistDescription(params)
			{
				var section = app.data.getStoryByIndex(params.index);
				if ( params.value != section.description ) {
					section.description = params.value;
					app.data.editSection(section);
					topic.publish("BUILDER_INCREMENT_COUNTER", 1);
				}
			}
			
			//
			// Organize
			//
			
			function openOrganizePopup()
			{
				$(".builder-organize").addClass("active");
				
				_organizePopup.present({
					story: app.data.getStory(),
					sectionIndex: app.data.getCurrentSectionIndex(),
					appLayout: WebApplicationData.getLayoutId(),
					layoutOpt: WebApplicationData.getLayoutOptions()
				}).then(
					function(result){
						console.log('builder.BuilderView.openOrganizePopup:', result);
						
						_organizePopup.close();
						
						app.data.organizeStory(
							result.entries, 
							result.sectionIndex
						);
						
						topic.publish("story-update-entries");
						topic.publish("BUILDER_INCREMENT_COUNTER", 1); // TODO
					},
					function(){
						_this.updateUI();
					}
				);
			}
			
			//
			// Settings
			//
			
			this.getSettingsTab = function()
			{
				return [
					new ViewLayout(),
					new ViewLayoutOptions(),
					new ViewMapOptions(),
					new ViewTheme(),
					new ViewHeader({
						smallSizeOpt: app.appCfg.headerCompactOpt
					})
				];
			};
			
			this.openSettingPopup = function(fieldsError)
			{
				_settingsPopup.present(
					[
						WebApplicationData.getLayout(),
						WebApplicationData.getLayoutOptions(),
						WebApplicationData.getMapOptions(),
						{
							layout: WebApplicationData.getLayoutId(),
							layoutCfg: WebApplicationData.getLayoutOptions().layoutCfg,
							theme: WebApplicationData.getTheme()
						},
						WebApplicationData.getHeader()
					],
					null
				);
			};
			
			function settingsPopupSave(data)
			{
				var nbChange = 1;

				//nbChange += CommonHelper.findDifferences(data.settings[0], WebApplicationData.getLayout()).length;

				// Will trigger layout detroy/init
				if ( nbChange )
					$("body").addClass("switchLayout");

				//nbChange += CommonHelper.findDifferences(data.settings[1], WebApplicationData.getLayoutOptions()).length;
				//nbChange += CommonHelper.findDifferences(data.settings[2], WebApplicationData.getTheme()).length;
				//nbChange += CommonHelper.findDifferences(data.settings[3], WebApplicationData.getHeader()).length;
				
				WebApplicationData.setLayout(data.settings[0]);
				WebApplicationData.setLayoutOptions(data.settings[1]);
				WebApplicationData.setMapOptions(data.settings[2]);
				WebApplicationData.setTheme({
					colors: data.settings[3].colors
				});
				WebApplicationData.setHeader(data.settings[4]);
			
				// TODO deprecate nbChange ...
				if ( nbChange ) {
					topic.publish("BUILDER_INCREMENT_COUNTER", nbChange);
					topic.publish("CORE_UPDATE_UI");
					topic.publish("CORE_RESIZE");
					
					// TODO
					setTimeout(function(){
						topic.publish("story-entry-reset-map-extent");
					}, 100);
				}
				
				updateAddButtonStatus();
			}
			
			//
			// Help
			//
			
			function clickHelp()
			{
				_helpUI.show();
			}
			
			function openHelpPopup(stepIndex, closeCallback)
			{
				_helpUI.show(stepIndex, closeCallback);
			}
			
			//
			// Direct creation first save
			//
			
			function openSharePopup(isFirstSave)
			{
				_sharePopup.present(isFirstSave);
			}
			
			//
			// Init popup
			//
			
			this.showInitPopup = function()
			{
				var layout = CommonHelper.getUrlParams().layout;
				
				Core.initPopupPrepare();
				
				_initPopup.init();
				_initPopup.initLocalization();
				
				if ( layout ){
					var layoutFound = $.grep(app.cfg.LAYOUTS, function(l){
						return layout == l.id;
					});
					
					layout = layoutFound.length ? layoutFound[0].id : app.cfg.LAYOUTS[0].id;
					
					initPopupComplete({id: layout});
					return;
				}
				
				_initPopup.present().then(
					initPopupComplete,
					function()
					{
						Core.initPopupFail();
					}
				);
			};
			
			function initPopupComplete(config)
			{
				app.data.setStoryStorage("WEBAPP");
				
				Core.displayApp();
				Core.initPopupComplete();
				app.data.getWebAppData().setLayout(config);
				app.data.getWebAppData().setDefaultLayoutOptions();
				
				topic.publish("CORE_UPDATE_UI");
				
				// Toggle off some components that would otherwise be desperately empty 
				$("body").addClass("isBuilderLanding");
				
				// Will trigger layout detroy/init in MainView/updateUI
				$("body").addClass("switchLayout");
				Core.appInitComplete();
				
				// Focus the landing screen title input
				// Except on iPad where the field is less sensible
				setTimeout(function(){
					if ( ! has("touch") )
						_landingUI.focus();
				}, 50);
			}
			
			/*jshint -W098 */
			this.resize = function(cfg)
			{
				//
			};
	
			this.initLocalization = function()
			{
				_settingsPopup.initLocalization();
			};
		};
	}
);