define([
        "./SocialSharing", 
        "../ui/share/ShareDialog"
    ], 
	function(
		SocialSharing,
		ShareDialog
	){
		var _shareDialog = new ShareDialog($("#shareDialog"));
		
		function resizeLinkContainer(container)
		{
			container.find(".linkContainer").css(
				"width",
				// TODO remove that ugly hack (186 is the width of the responsive view header container)
				(container.find(".logoContainer").position()||{ left: 186 }).left
				- container.find(".linkContainer").parent().position().left
				- container.find(".shareBtns").outerWidth() 
				// need a margin if there is a logo
				- ($(".logoContainer").width() > 1 ? 14 : 4)
			);
		}
		
		return {
			setLogo: function(container, headerCfg)
			{
				if ( ! headerCfg.logoURL || headerCfg.logoURL == "NO_LOGO" ) {
					container.find('.logoImg').hide();
					resizeLinkContainer(container);
				}
				else {
					container.find('.logoLink').css("cursor", headerCfg.logoTarget ? "pointer" : "default");
					
					if (headerCfg.logoTarget)
						container.find('.logoLink').attr("href", headerCfg.logoTarget);
					
					resizeLinkContainer(container);
					
					container.find('.logoImg')[0].onload = function(){
						resizeLinkContainer(container);
					};
					container.find('.logoImg')[0].onerror = function(){
						resizeLinkContainer(container);
					};
					
					container.find('.logoImg').attr("src", headerCfg.logoURL).show();
				}
			},
			setLink: function(container, headerCfg)
			{
				if( headerCfg.linkURL && headerCfg.linkText )
					container.find('.linkContainer').html('<a href="' + headerCfg.linkURL + '" class="link" target="_blank" tabindex="-1">' + headerCfg.linkText + '</a>');
				else 
					container.find('.linkContainer').html(headerCfg.linkText);
			},
			setSocial: function(container, headerCfg)
			{
				var appCfg = app.cfg.HEADER_SOCIAL,
					userCfg = headerCfg.socialBtn,
					enableFacebook = appCfg && appCfg.facebook && (!userCfg || userCfg.facebook),
					enableTwitter = appCfg && appCfg.twitter && (!userCfg || userCfg.twitter),
					enableBitly = appCfg && appCfg.bitly && appCfg.bitly.enable && appCfg.bitly.login 
						&& appCfg.bitly.key && (!userCfg || userCfg.bitly);
				
				container.find(".share_facebook").toggleClass(
					'active',
					enableFacebook
				);
				
				container.find(".share_twitter").toggleClass(
					'active',
					enableTwitter
				);
				
				container.find(".share_bitly").toggleClass(
					'active',
					enableBitly
				);
				
				container.find(".share-all")
					.data('share-facebook', enableFacebook)
					.data('share-twitter', enableTwitter)
					.toggleClass(
						'active',
						enableFacebook || enableTwitter || enableBitly
					);
			},
			toggleSocialBtnAppSharing: function(container, disable)
			{
				container.find(".shareIcon")
					.toggleClass("disabled", !! disable)
					.tooltip(disable ? {
						title: i18n.commonCore.builderPanel.tooltipNotShared,
						container: 'body'
					} : 'destroy');
			},
			initEvents: function(container/*, bitlyPlacement*/)
			{
				container.find(".share_facebook").off('click').click(function(){
					if ( $(this).hasClass("disabled") )
						return;
					
					var title = $('<div>' + (app.data.getWebAppData().getTitle()||'') + '</div>').text(),
						subtitle = $('<div>' + (app.data.getWebAppData().getSubtitle()||'') + '</div>').text();

					SocialSharing.shareFacebook(
						title, 
						subtitle, 
						null, 
						$(this).data('url')
					);
				});
				container.find(".share_twitter").off('click').click(function(){
					if ( $(this).hasClass("disabled") )
						return;
					
					var title = $('<div>' + (app.data.getWebAppData().getTitle()||'') + '</div>').text();
					
					SocialSharing.shareTwitter(
						title, 
						$(this).data('url')
					);
				});
				/*
				container.find(".share_bitly").off('click').click(function(){
					SocialSharing.shareBitly(
						$(this).parent(), 
						bitlyPlacement, 
						$(this).data('url')
					);
				});
				*/
				container.find(".share_bitly").off('click').click(function(){
					if ( $(this).hasClass("disabled") )
						return;
					
					var url = $(this).data('url') || document.location.href;
					
					_shareDialog.present(SocialSharing.cleanURL(url, true));
				});
				
				container.find(".share-all").off('click').click(function(){
					if ( $(this).hasClass("disabled") )
						return;
					
					var url = $(this).data('url') || document.location.href;
					
					_shareDialog.present(
						SocialSharing.cleanURL(url, true),
						{
							facebook: !! $(this).data("share-facebook"),
							twitter: !! $(this).data("share-twitter")
						}
					);
				});
				
				$(window).resize(function(){
					resizeLinkContainer(container);
				});
			}
		};
	}
);