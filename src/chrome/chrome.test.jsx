import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/preact';
import { h } from 'preact';
import { greeting } from './greeting.js';
import { TopBar } from './TopBar.jsx';
import { pagePalette } from '../theme/palettes.js';

describe('greeting', () => {
	it('varies by hour', () => {
		expect(greeting(8)).toBe('Good morning');
		expect(greeting(14)).toBe('Good afternoon');
		expect(greeting(20)).toBe('Good evening');
		expect(greeting(2)).toBe('Good night');
	});
});

describe('TopBar', () => {
	it('toggles edit', () => {
		const onToggleEdit = vi.fn();
		const { getByText } = render(h(TopBar, { pg:pagePalette('light'), editing:false, theme:'light', width:'fixed', accent:'#c96442', onToggleEdit, onToggleTheme:vi.fn(), onSetWidth:vi.fn(), onSetAccent:vi.fn(), onAdd:vi.fn(), menus:null, onOpenMenu:vi.fn() }));
		fireEvent.click(getByText('Edit'));
		expect(onToggleEdit).toHaveBeenCalled();
	});
	it('settings shows Connect folder when supported and disconnected', async () => {
		const onConnectFolder = vi.fn();
		const { getByTitle, getByText } = render(h(TopBar, {
			pg: pagePalette('light'), editing:false, theme:'light', width:'fixed', accent:'#c96442',
			onToggleEdit(){}, onToggleTheme(){}, onSetWidth(){}, onSetAccent(){}, onAdd(){},
			menus:'settings', onOpenMenu(){},
			syncSupported:true, syncFolder:null, onConnectFolder, onDisconnectFolder(){},
		}));
		getByText('Connect folder').click();
		expect(onConnectFolder).toHaveBeenCalled();
	});
	it('settings shows folder name and Disconnect when connected', () => {
		const { getByText } = render(h(TopBar, {
			pg: pagePalette('light'), editing:false, theme:'light', width:'fixed', accent:'#c96442',
			onToggleEdit(){}, onToggleTheme(){}, onSetWidth(){}, onSetAccent(){}, onAdd(){},
			menus:'settings', onOpenMenu(){},
			syncSupported:true, syncFolder:{ name:'MyFolder' }, onConnectFolder(){}, onDisconnectFolder(){},
		}));
		expect(getByText('MyFolder')).toBeTruthy();
		expect(getByText('Disconnect')).toBeTruthy();
	});
});
