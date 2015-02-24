define(["lib-build/css!./MainView",
		"../ui/MainStage",
		"./Config",
		"./Data",
		"./WebApplicationData",
		"./Helper",
		// Desktop UI
		"../ui/desktop/AccordionPanel",
		"../ui/desktop/NavBar",
		"../ui/desktop/DescriptionAndLegendPanel",
		// Mobile UI
		"../ui/mobile/Header",
		"../ui/mobile/EntryInfo",
		"../ui/mobile/Footer",
		"../ui/mobile/PopupUtils",
		// Common
		"storymaps/common/mapcontrols/command/MapCommand",
		"storymaps/common/mapcontrols/legend/Legend",
		"storymaps/common/mapcontrols/overview/Overview",
		"storymaps/common/mapcontrols/geocoder/Geocoder",
		"lib-build/css!storymaps/common/ui/Modal.css",
		"lib-build/css!storymaps/common/utils/SocialSharing.css",
		"lib-build/css!storymaps/common/ui/loadingIndicator/loadingIndicator.css",
		// Utils
		"storymaps/common/utils/CommonHelper",
		"dojo/has",
		"dojo/topic",
		"esri/arcgis/utils",
		"esri/geometry/Extent",
		"../ui/StoryText",
		"lib-build/css!../ui/Common",
		"lib-build/css!../ui/StoryText",
		"lib-build/css!../ui/mobile/Common",
		"lib-build/css!../ui/Responsive"
	],
	function (
		viewCss,
		MainStage,
		Config,
		Data,
		WebApplicationData,
		Helper,
		AccordionPanel,
		NavBar,
		DescriptionAndLegendPanel,
		MobileHeader,
		MobileEntryInfo,
		MobileFooter,
		MobilePopupUtils,
		MapCommand,
		Legend,
		Overview,
		Geocoder,
		modalCss,
		socialSharingCss,
		loadingIndicatorCss,
		CommonHelper,
		has,
		topic,
		arcgisUtils,
		Extent,
		StoryText
	){
		/**
		 * @preserve This application is released under the Apache License V2.0 by Esri http://www.esri.com/
		 * Checkout the project repository on GitHub to access source code, latest revision, developer documentation, FAQ and tips
		 * https://github.com/Esri/map-series-storytelling-template-js
		 */
		return function MainView(builderView)
		{
			var _core = null;

			this.init = function(core)
			{
				_core = core;

				// Do not allow builder under IE 10
				if( app.isInBuilder && has("ie") && has("ie") < 10) {
					i18n.viewer.errors.noBuilderIE = i18n.viewer.errors.noBuilderIE.replace('%VERSION%', 10).replace('%UPGRADE%', i18n.viewer.errors.upgradeBrowser);
					_core.initError("noBuilderIE");
					return false;
				}
				// Do not allow viewer under IE 9
				else if ( has("ie") && has("ie") <= 8 ) {
					i18n.viewer.errors.noViewerIE = i18n.viewer.errors.noViewerIE.replace('%VERSION%', 9).replace('%UPGRADE%', i18n.viewer.errors.upgradeBrowser);
					_core.initError("noViewerIE");
					return false;
				}

				// Prevent iPad vertical bounce effect
				// except on few containers that needs that
				$(document).bind(
					'touchmove',
					function(e) {
						//console.log($(e.target).parents().each(function(i, p){ console.log(p.className); }));
						if( ! $(e.target).parents('.legendContainer, #descLegendPanel, #accordionPanel, .mobilePopup, #headerMobile, .settings-layout').length )
							e.preventDefault();
					}
				);

				// Data Model
				app.data = new Data();

				app.ui.mainStage = new MainStage(
					$("#mainStagePanel"),
					app.isInBuilder,
					this
				);

				/*
				 * Desktop UI
				 */
				app.ui.accordionPanel = new AccordionPanel(
					$("#accordionPanel"),
					app.isInBuilder,
					navigateStoryToIndex
				);

				app.ui.navBar = new NavBar(
					$("#nav-bar"),
					app.isInBuilder,
					navigateStoryToIndex
				);

				app.ui.descLegendPanel = new DescriptionAndLegendPanel(
					$("#descLegendPanel"),
					app.isInBuilder
				);

				// Map Controls CSS placement is dependent of config.js and so has to be generated at runtime
				createMapControlsPlacementRules();

				/*
				 * Mobile UI
				 */
				app.ui.mobileHeader = new MobileHeader(
					$("#headerMobile"),
					app.isInBuilder,
					navigateStoryToIndex
				);

				app.ui.mobileEntryInfo = new MobileEntryInfo(
					$("#mobileInfoBtn")
				);

				app.ui.mobileFooter = new MobileFooter(
					$("#footerMobile"),
					app.isInBuilder,
					navigateStoryToIndex
				);

				topic.subscribe("story-navigate-entry", navigateStoryToIndex);
				topic.subscribe("story-update-entries", updateUIStory);
				topic.subscribe("story-update-entry", updateStoryEntry);
				topic.subscribe("story-entry-reset-map-extent", resetEntryMapExtent);

				topic.subscribe("ADDEDIT_LOAD_WEBMAP", app.ui.mainStage.loadTmpWebmap);
				topic.subscribe("ADDEDIT_SHOW_WEBMAP", app.ui.mainStage.showWebmapById);

				// Update description panel layout when current map is loaded
				topic.subscribe("story-loaded-map", function(e) {
					if ( e.index == app.data.getCurrentSectionIndex() )
						updateDescriptionPanelMinHeight();
				});

				return true;
			};

			this.webAppConfigLoaded = function()
			{
				app.data.setStoryStorage(WebApplicationData.getStoryStorage());

				//var enableSwitchBuilderBtn = _core.hasSwitchBuilderButton();
				//app.ui.sidePanel.toggleSwitchBuilderButton(enableSwitchBuilderBtn);

				// If the app has been loaded but it's blank it means user come from the gallery
				// FromScratch doesn't get here
				// From the webmap has the webmap id
				app.isGalleryCreation = ! app.data.getWebAppData().getOriginalData()
					|| ! Object.keys(app.data.getWebAppData().getOriginalData().values).length;
			};

			this.loadFirstWebmap = function(/*webmapIdOrJSON*/)
			{
				//
			};

			this.loadWebmapFromData = function()
			{
				storyDataReady();
			};

			this.loadWebmap = function(webmapIdOrJSON, container, extent)
			{
				console.log("tpl.core.MainView - loadWebMap - webmapId:", webmapIdOrJSON);

				var popup = null;

				return arcgisUtils.createMap(webmapIdOrJSON, container, {
					mapOptions: {
						slider: true,
						autoResize: false,
						showAttribution: true,
						infoWindow: popup,
						extent: extent,
						maxZoom: 12
					},
					usePopupManager: true,
					ignorePopups: false,
					bingMapsKey: commonConfig.bingMapsKey,
					editable: false
				});
			};

			this.firstWebmapLoaded = function()
			{
				//
			};

			this.startFromScratch = function()
			{
				initUI();
			};

			this.getMapConfig = function(response, mapContainer)
			{
				return {
					response: response,
					mapCommand: new MapCommand(
						response.map,
						resetEntryMapExtent,
						_core.zoomToDeviceLocation,
						app.data.getWebAppData().getLocateBtn()
					),
					legend: new Legend(
						response,
						app.isInBuilder,
						getLegendSettings(mapContainer, response.itemInfo.item.id)
					),
					overview: new Overview(
						response.map,
						mapContainer.siblings('.overview'),
						app.isInBuilder
					),
					geocoder: new Geocoder(
						response.map,
						app.isInBuilder,
						app.data.getWebAppData().getGeocoder()
					)
				};
			};

			function getLegendSettings(mapContainer, webmapId)
			{
				var placement = WebApplicationData.getLegendPlacement(),
					container = mapContainer.siblings('.legend');

				if ( $("body").hasClass("mobile-view") ) {
					placement = "panel";
					container = mapContainer.siblings('.mobilePopup').find('.legendMobile');
				}
				else if ( placement == "panel" )
					container = app.ui.descLegendPanel.getLegendContainer(webmapId);

				return {
					mode: placement,
					container: container
				};
			}

			function storyDataReady()
			{
				var storyLength = app.data.getStoryLength(),
					storyIndex = 0,
					storyIndexUrl = parseInt(CommonHelper.getUrlParams().entry, 10);

				if ( storyIndexUrl )
					storyIndex = storyIndexUrl - 1;

				if ( storyIndex >= storyLength )
					storyIndex = 0;

				if ( storyLength )
					app.data.setCurrentSectionIndex(storyIndex);

				if ( storyLength ) {
					// Make components visible before they get created
					$("body").addClass("layout-" + WebApplicationData.getLayoutId());

					// Load the panel content and the Main Stage media
					// Will create Main Stage media containers
					updateUIStory();

					// Give it's size to everyone
					_core.handleWindowResize();

					// If it's not a webmap we are ready
					if ( app.data.getCurrentSection().media.type != 'webmap' ) {
						initUI();
					}
					// It's a Map - wait for it to be loaded/centered
					else {
						var handle, handle2;

						handle = topic.subscribe("story-loaded-map", function(){
							handle.remove();
							handle2.remove();

							initUI();
						});

						handle2 = topic.subscribe("story-entry-map-timeout", function(){
							handle.remove();
							handle2.remove();

							initUI();
						});
					}
				}
				else
					initUI();
			}

			function initUI()
			{
				// App has been configured
				if ( ! WebApplicationData.isBlank() )
					_core.appInitComplete();
				// No data and in builder mode -> open the FS creation popup
				else if ( app.isInBuilder ) {
					if( _core.isProd() )
						builderView.showInitPopup();
					else
						_core.portalLogin().then(
							builderView.showInitPopup,
							function(){
								_core.initError("noLayerNoHostedFS");
							}
						);
				}
				// No data in view mode
				else if( CommonHelper.getAppID(_core.isProd()) ) {
					if( app.data.userIsAppOwner() ){
						//app.ui.loadingIndicator.setMessage(i18n.viewer.loading.loadBuilder);
						//setTimeout(function(){
							CommonHelper.switchToBuilder();
						//}, 1200);
					}
					else
						_core.initError("notConfiguredDesktop");
				}
				// No data in preview mode (should not happen)
				else {
					_core.initError("noLayer");
				}

				if ( builderView )
					builderView.updateUI();
			}

			function initLayout()
			{
				var appLayout = WebApplicationData.getLayoutId(),
					appColors = WebApplicationData.getColors(),
					layoutOpt = WebApplicationData.getLayoutOptions(),
					entries = app.data.getStoryEntries(),
					entryIndex = app.data.getCurrentSectionIndex();

				/*
				 * Desktop UI
				 */

				if ( appLayout == "accordion" ) {

					// As layout is using a table to align Side Accordion Panel and Main Stage
					//  have to flip the node when needed
					if ( layoutOpt.panel.position == "left" ) {
						if ( ! $("#accordionPanel").parent().children().eq(0).is("#accordionPanel") )
							$("#mainStagePanel").before($("#accordionPanel"));
					}
					else {
						if ( ! $("#accordionPanel").parent().children().eq(0).is("#mainStagePanel") )
							$("#accordionPanel").before($("#mainStagePanel"));
					}

					app.ui.accordionPanel.init(
						entries,
						entryIndex,
						layoutOpt,
						appColors
					);
					app.ui.descLegendPanel.destroy();
				}
				else {
					app.ui.navBar.init(
						entries,
						entryIndex,
						appLayout,
						layoutOpt,
						appColors
					);

					app.ui.descLegendPanel.init(
						entries,
						entryIndex,
						layoutOpt,
						appColors,
						getCurrentEntryLayoutCfg()
					);
				}

				/*
				 * Mobile UI
				 */

				if ( hasMobileView() ) {
					app.ui.mobileHeader.init({
						title: WebApplicationData.getTitle(),
						subtitle: WebApplicationData.getSubtitle(),
						headerCfg: _core.getHeaderUserCfg({ useMobileLogo: true }),
						entries: entries,
						entryIndex: entryIndex,
						appLayout: appLayout,
						layoutOpt: layoutOpt,
						appColors: appColors
					});

					app.ui.mobileEntryInfo.init({
						entries: entries,
						entryIndex: entryIndex
					});

					MobilePopupUtils.setColors(appColors);

					app.ui.mobileFooter.init({
						entries: entries,
						entryIndex: entryIndex,
						appLayout: appLayout,
						layoutOpt: layoutOpt,
						appColors: appColors
					});
				}
			}

			function hasMobileView()
			{
				return has("ie") === undefined || has("ie") > 8;
			}

			// about data...
			function updateUIStory()
			{
				app.ui.mainStage.updateMainMediaContainers();

				initLayout();

				setCommonLayoutColor();
				StoryText.createMediaFullScreenButton();
				StoryText.styleSectionPanelContent();

				navigateStoryToIndex(app.data.getCurrentSectionIndex());

				if ( builderView )
					builderView.updateUI();
			}

			function updateStoryEntry(cfg)
			{
				// TODO: should only refresh the item
				updateUIStory();
				navigateStoryToIndex(cfg.index);
			}

			// Layout only
			this.updateUI = function()
			{
				var appColors = app.data.getWebAppData().getColors(),
					appLayout = app.data.getWebAppData().getLayoutId();

				// If switching layout - builder only
				if ( $("body").hasClass("switchLayout") ) {
					//var classes = $.map(app.cfg.LAYOUTS, function(l){ return "layout-" + l.id; }).join(' ');
					// Remove all classes from body that starts with layout-
					var classes = $.map($("body").attr("class").split(' '), function(l){ return l.match(/layout-/) ? l : null; }).join(' ');
					$("body").removeClass("switchLayout").removeClass(classes);

					//app.ui.sidePanel.destroy();
					//app.ui.floatingPanel.destroy();

					initLayout(appLayout);
					// Need to wait a bit for Side Panel
					setTimeout(function(){
						navigateStoryToIndex(app.data.getCurrentSectionIndex());
						updateUIStory();
					}, 50);
				}

				// Add the new layout class
				$("body")
					.addClass("layout-" + appLayout)
					.attr("data-theme-major", appColors.themeMajor);

				$.each(Object.keys(app.maps), function(i, id){
					app.maps[id].mapCommand.enableLocationButton(WebApplicationData.getLocateBtn());
					app.maps[id].geocoder.toggle(WebApplicationData.getGeocoder());
					app.maps[id].legend.updatePlacementSettings(
						getLegendSettings($(app.maps[id].response.map.container), id)
					);
				});

				setCommonLayoutColor();

				updateLayout();
				app.ui.mainStage.updateMainStageWithLayoutSettings();

				//app.ui.mobileView.update(_core.getHeaderUserCfg(), appColors);
			};

			function updateLayout()
			{
				var appLayout = WebApplicationData.getLayoutId(),
					appColors = WebApplicationData.getColors(),
					layoutOpt = WebApplicationData.getLayoutOptions();

				if ( appLayout == "accordion" )
					app.ui.accordionPanel.update(layoutOpt, appColors);
				else {
					app.ui.navBar.update(appLayout, layoutOpt, appColors);
					app.ui.descLegendPanel.update(layoutOpt, appColors, getCurrentEntryLayoutCfg());
				}

				if ( hasMobileView() ) {
					app.ui.mobileHeader.update({
						layoutOpt: layoutOpt,
						appColors: appColors
					});

					MobilePopupUtils.setColors(appColors);

					app.ui.mobileFooter.update({
						appColors: appColors
					});
				}
			}

			function setCommonLayoutColor()
			{
				var colors = WebApplicationData.getColors();
				CommonHelper.addCSSRule(".textEditorContent a { color: " + colors.textLink + "; }");
			}

			function updateDescriptionPanelMinHeight()
			{
				var currentEntry = app.data.getCurrentSection(),
					mediaIsMap = currentEntry && currentEntry.media && currentEntry.media.type == "webmap",
					minHeight = 0;

				// Min height depend on Map controls
				if ( mediaIsMap ) {
					var map = $(".mainMediaContainer.active"),
						geocoder = map.find('.geocoderBtn'),
						locator = map.find('.mapCommandLocation'),
						command = map.find('.esriSimpleSliderTL');

					minHeight = Math.max(
						geocoder && geocoder.position() ? geocoder.position().top + geocoder.height() : 0,
						locator  && locator.position()  ? locator.position().top  + locator.height()  : 0,
						command  && command.position()  ? command.position().top  + command.height()  : 0
					);
				}

				$("#descLegendPanel").css(
					"min-height",
					minHeight ? minHeight + 20 : "inherit"
				);
			}

			// Mostly for Desktop?
			// TODO should that switch to the same pattern
			//  used for other stuff where it's done on resize MainStage > updateMainStageWithLayoutSettings
			function createMapControlsPlacementRules()
			{
				var targetLayouts = ["tab", "bullet"],
					sizesOptions = ['small', 'medium', 'large'],
					bodyPrefix = "body:not(.mobile-view).layout-";

				$.each(app.cfg.LAYOUTS, function(i, layout){
					if ( targetLayouts.indexOf(layout.id) != - 1 ) {
						$.each(sizesOptions, function(i, size){
							var targetSize = "calc(" + parseInt(layout.sizes[size], 10) + "% + 20px)";

							// Map Controls
							CommonHelper.addCSSRule(
								bodyPrefix + layout.id + "-left-" + size + " .esriSimpleSlider,"
								+ bodyPrefix + layout.id + "-left-" + size + " .geocoderBtn"
								+ "{ left:" + targetSize + "; }"
							);

							/*
							CommonHelper.addCSSRule(
								bodyPrefix + layout.id + "-right-" + size + " .esriSimpleSlider,"
								+ bodyPrefix + layout.id + "-right-" + size + " .geocoderBtn"
								+ "{ left: inherit; right:" + targetSize + "; }"
							);
							*/

							// Overview
							CommonHelper.addCSSRule(
								bodyPrefix + layout.id + "-left-" + size + " .mainMediaContainer .overviewContainer"
								+ "{ left: inherit; right: 20px; }"
							);

							CommonHelper.addCSSRule(
								bodyPrefix + layout.id + "-right-" + size + " .mainMediaContainer .overviewContainer"
								+ "{ left: 20px; }"
							);

							// Legend
							CommonHelper.addCSSRule(
								bodyPrefix + layout.id + "-right-" + size + " .mainMediaContainer .legendContainer"
								+ "{ right:" + targetSize + "; }"
							);
						});
					}
				});
			}

			this.resize = function(cfg)
			{
				var appLayout = WebApplicationData.getLayoutId();

				// Firefox and IE
				$("#mainStagePanelInner, #accordionPanel > .content").height($("#contentPanel").height());

				if ( appLayout == "accordion" )
					app.ui.accordionPanel.resize(cfg);
				else {
					app.ui.navBar.resize(cfg);
					app.ui.descLegendPanel.resize(cfg);
				}

				if ( hasMobileView() )
					app.ui.mobileFooter.resize(cfg);

				// Maintain the current section in all layouts
				//  TODO: can we maintain the slider activeIndex while it's not visible? (vis: hidden instead of display?)
				var sectionIndex = app.data.getCurrentSectionIndex();
				app.ui.mobileFooter.showEntryIndex(sectionIndex);

				// Style panel content (iframe sizing)
				StoryText.styleSectionPanelContent();

				app.ui.mainStage.updateMainStageWithLayoutSettings();

				// Popup dimension
				CommonHelper.addCSSRule(
					".mobilePopup { max-height:" + Math.min(cfg.height - 120, 300) + "px; }",
					"MobilePopup"
				);
			};

			this.setMapExtent = function(extent, map)
			{
				return _core.setMapExtent(extent, map);
			};

			this.getLayoutExtent = function(extent, reverse, debug)
			{
				return Helper.getLayoutExtent(extent, reverse, debug);
			};

			//
			// Initialization
			//

			this.checkConfigFileIsOK = function()
			{
				return Config.checkConfigFileIsOK();
			};

			this.appInitComplete = function()
			{
				this.updateUI();
				_core.cleanLoadingTimeout()
				;
				$(window).resize();

				if ( ! app.isDirectCreation )
					_core.displayApp();

				topic.publish("tpl-ready");

				app.ui.mainStage.preloadAllMaps();
			};



			//
			// Story events
			//

			function navigateStoryToIndex(index)
			{
				var layout = WebApplicationData.getLayoutId(),
					layoutOpt = WebApplicationData.getLayoutOptions(),
					animateMainStageTransition = false;

				console.log("tpl.core.MainView - navigateStoryToIndex - ", index);

				if ( app.data.getCurrentSection() ) {
					var currentEntry = app.data.getCurrentSection(),
						currentType = currentEntry && currentEntry.media ? currentEntry.media.type : null,
						newEntry = app.data.getStoryByIndex(index),
						newType = newEntry && newEntry.media ? newEntry.media.type : null;

					if ( currentType != newType )
						animateMainStageTransition = true;
				}

				// Change current section
				app.data.setCurrentSectionIndex(index);

				// Refresh Main Stage
				app.ui.mainStage.updateMainMediaWithStoryMainMedia(index, animateMainStageTransition);

				var layoutEntryCfg = getCurrentEntryLayoutCfg(),
					hasPanel = layout == "accordion" || layoutEntryCfg.description || layoutEntryCfg.legend;

				//
				// Refresh Story panels
				//

				$("body")
					.toggleClass("layout-" + layout + "-" + layoutOpt.panel.position, hasPanel)
					.toggleClass("layout-" + layout + "-" + layoutOpt.panel.position + "-" + layoutOpt.panel.sizeLbl, hasPanel);

				if ( layout == "accordion" )
					app.ui.accordionPanel.showEntryIndex(index);
				else {
					app.ui.navBar.showEntryIndex(index);
					app.ui.descLegendPanel.showEntryIndex(index, false, layoutEntryCfg);
					updateDescriptionPanelMinHeight();
				}

				if ( hasMobileView() ) {
					app.ui.mobileHeader.showEntryIndex(index);
					app.ui.mobileEntryInfo.showEntryIndex(index, layoutEntryCfg);
					app.ui.mobileFooter.showEntryIndex(index);
				}

				$('.mediaBackContainer').hide();
			}

			function getCurrentEntryLayoutCfg()
			{
				var entry = app.data.getCurrentSection(),
					layout = WebApplicationData.getLayoutId(),
					layoutOpt = WebApplicationData.getLayoutOptions();

				if ( ! entry || ! entry.media || ! entry.media[entry.media.type] )
					return {};

				return {
					description: !! ((layout == "accordion" || layoutOpt.description) && (entry.description || app.isInBuilder)),
					legend: !! ((layout == "accordion" || layoutOpt.legend == "panel")
						&& entry.media.type == "webmap"
						&& entry.media.webmap.legend
						&& entry.media.webmap.legend.enable)
				};
			}

			this.onHashChange = function()
			{
				//var view = location.hash ? location.hash.substring(1) : "";
				//app.ui.mobileView.setView(view);
			};

			//
			// User events
			//

			function resetEntryMapExtent()
			{
				var currentSection = app.data.getCurrentSection(),
					currentSectionIsWebmap = !! (currentSection && currentSection.media && currentSection.media.type == 'webmap' && currentSection.media.webmap),
					currentSectionDefineExtent = !! (currentSectionIsWebmap ? currentSection.media.webmap.extent : null),
					webmapId = currentSectionIsWebmap ? currentSection.media.webmap.id : null;
					//webmapItemInfo = currentSectionIsWebmap && app.maps && app.maps[webmapId] && app.maps[webmapId].response ? app.maps[webmapId].response.itemInfo.item : null;

				if ( ! currentSectionIsWebmap )
					return;

				if ( currentSectionDefineExtent )
					topic.publish("CORE_UPDATE_EXTENT", new Extent(currentSection.media.webmap.extent));
				else
					topic.publish("CORE_UPDATE_EXTENT", app.maps[webmapId].response.map._params.extent /*CommonHelper.getWebMapExtentFromItem(webmapItemInfo)*/);
			}

			this.prepareMobileViewSwitch = function()
			{
				//
			};

			this.initLocalization = function()
			{
				//
			};
		};
	}
);
