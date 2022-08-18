import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import {
    MuiClickAwayListener,
    styled,
    MuiPopper as Popper,
    MuiGrow as Grow,
    MuiPaper as Paper,
} from '@toeverything/components/ui';
import { Virgo, HookType, PluginHooks } from '@toeverything/framework/virgo';

import { DoubleLinkMenuContainer } from './Container';
import { QueryBlocks, QueryResult } from '../../search';
import { services } from '@toeverything/datasource/db-service';
import { getPageId } from '@toeverything/utils';
import { CommonListItem } from '@toeverything/components/common';
import { AddIcon } from '@toeverything/components/icons';

const ADD_NEW_SUB_PAGE = 'AddNewSubPage';
const ADD_NEW_PAGE = 'AddNewPage';

export type DoubleLinkMenuProps = {
    editor: Virgo;
    hooks: PluginHooks;
    style?: { left: number; top: number };
};

type DoubleMenuStyle = {
    left: number;
    top: number;
    height: number;
};

export const DoubleLinkMenu = ({
    editor,
    hooks,
    style,
}: DoubleLinkMenuProps) => {
    const [isShow, setIsShow] = useState(false);
    const [blockId, setBlockId] = useState<string>();
    const [searchText, setSearchText] = useState<string>('');
    const [searchBlocks, setSearchBlocks] = useState<QueryResult>([]);
    const [items, setItems] = useState<CommonListItem[]>([]);
    const [isNewPage, setIsNewPage] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const ref = useRef();
    const [referenceMenuStyle, setReferenceMenuStyle] =
        useState<DoubleMenuStyle>({
            left: 0,
            top: 0,
            height: 0,
        });

    useEffect(() => {
        QueryBlocks(editor, searchText, result => {
            setSearchBlocks(result);
            const items: CommonListItem[] = [];
            if (searchBlocks?.length > 0) {
                items.push({
                    content: {
                        id: 'linktopage',
                        content: 'LINK TO PAGE',
                    },
                });
                items.push(
                    ...(searchBlocks?.map(
                        block => ({ block } as CommonListItem)
                    ) || [])
                );
            }

            if (items.length > 0) {
                items.push({ divider: 'newPage' });
            }
            items.push({
                content: {
                    id: ADD_NEW_SUB_PAGE,
                    content: 'Add new sub-page',
                    icon: AddIcon,
                },
            });
            items.push({
                content: {
                    id: ADD_NEW_PAGE,
                    content: 'Add new page in...',
                    icon: AddIcon,
                },
            });

            setItems(items);
        });
    }, [editor, searchText]);

    const searchBlockIds = useMemo(
        () => Object.values(searchBlocks).map(({ id }) => id),
        [searchBlocks]
    );

    const hideMenu = useCallback(() => {
        setIsShow(false);
        editor.blockHelper.removeDoubleLinkSearchSlash(blockId);
        editor.scrollManager.unLock();
    }, [blockId, editor.blockHelper, editor.scrollManager]);

    const handleSearch = useCallback(
        async (event: React.KeyboardEvent<HTMLDivElement>) => {
            const { type, anchorNode } = editor.selection.currentSelectInfo;
            if (
                type === 'Range' &&
                anchorNode &&
                editor.blockHelper.isSelectionCollapsed(anchorNode.id)
            ) {
                const text = editor.blockHelper.getBlockTextBeforeSelection(
                    anchorNode.id
                );

                if (text.endsWith('[[')) {
                    if (
                        [
                            'ArrowRight',
                            'ArrowLeft',
                            'ArrowUp',
                            'ArrowDown',
                        ].includes(event.key)
                    ) {
                        return;
                    }
                    if (event.key === 'Backspace') {
                        hideMenu();
                        return;
                    }
                    setBlockId(anchorNode.id);
                    editor.blockHelper.removeDoubleLinkSearchSlash(blockId);
                    setTimeout(() => {
                        const textSelection =
                            editor.blockHelper.selectionToSlateRange(
                                anchorNode.id,
                                editor.selection.currentSelectInfo
                                    .browserSelection
                            );
                        if (textSelection) {
                            const { anchor } = textSelection;
                            editor.blockHelper.setDoubleLinkSearchSlash(
                                anchorNode.id,
                                anchor
                            );
                        }
                    });
                    setSearchText('');
                    setIsShow(true);
                    editor.scrollManager.lock();
                    const rect =
                        editor.selection.currentSelectInfo?.browserSelection
                            ?.getRangeAt(0)
                            ?.getBoundingClientRect();
                    if (rect) {
                        const rectTop = rect.top;
                        const { top, left } =
                            editor.container.getBoundingClientRect();
                        setReferenceMenuStyle({
                            top: rectTop - top,
                            left: rect.left - left,
                            height: rect.height,
                        });
                        setAnchorEl(ref.current);
                    }
                }
            }
            if (isShow) {
                const searchText =
                    editor.blockHelper.getDoubleLinkSearchSlashText(blockId);
                if (searchText && searchText.startsWith('[[')) {
                    setSearchText(searchText.slice(2).trim());
                }
            }
        },
        [editor, isShow, blockId, hideMenu]
    );

    const handleKeyup = useCallback(
        (event: React.KeyboardEvent<HTMLDivElement>) => handleSearch(event),
        [handleSearch]
    );

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLDivElement>) => {
            if (event.code === 'Escape') {
                hideMenu();
            }
        },
        [hideMenu]
    );

    useEffect(() => {
        const sub = hooks
            .get(HookType.ON_ROOT_NODE_KEYUP)
            .subscribe(handleKeyup);
        sub.add(
            hooks
                .get(HookType.ON_ROOT_NODE_KEYDOWN_CAPTURE)
                .subscribe(handleKeyDown)
        );

        return () => {
            sub.unsubscribe();
        };
    }, [handleKeyup, handleKeyDown, hooks]);

    const handleSelected = async (linkBlockId: string) => {
        if (blockId) {
            if (linkBlockId === ADD_NEW_SUB_PAGE) {
                handleAddSubPage();
                return;
            }
            if (linkBlockId === ADD_NEW_PAGE) {
                setIsNewPage(true);
                return;
            }
            if (isNewPage) {
                const newPage = await services.api.editorBlock.create({
                    workspace: editor.workspace,
                    type: 'page' as const,
                });
                await services.api.pageTree.addChildPageToWorkspace(
                    editor.workspace,
                    linkBlockId,
                    newPage.id
                );
                linkBlockId = newPage.id;
            }
            editor.blockHelper.setSelectDoubleLinkSearchSlash(blockId);
            await editor.blockHelper.insertDoubleLink(
                editor.workspace,
                linkBlockId,
                blockId
            );
            hideMenu();
        }
    };

    const handleClose = () => {
        blockId && editor.blockHelper.removeDoubleLinkSearchSlash(blockId);
    };

    const handleAddSubPage = async () => {
        const newPage = await services.api.editorBlock.create({
            workspace: editor.workspace,
            type: 'page' as const,
        });
        setIsNewPage(false);
        await services.api.pageTree.addChildPageToWorkspace(
            editor.workspace,
            getPageId(),
            newPage.id
        );
        handleSelected(newPage.id);
    };

    const handleAddNewPage = async () => {
        setIsNewPage(true);
    };

    return (
        <div
            ref={ref}
            style={{
                position: 'absolute',
                width: '10px',
                ...referenceMenuStyle,
            }}
        >
            <MuiClickAwayListener onClickAway={() => hideMenu()}>
                <Popper
                    open={isShow}
                    anchorEl={anchorEl}
                    transition
                    placement="bottom-start"
                >
                    {({ TransitionProps }) => (
                        <Grow
                            {...TransitionProps}
                            style={{
                                transformOrigin: 'left bottom',
                            }}
                        >
                            <Paper>
                                <DoubleLinkMenuWrapper onKeyUp={handleKeyup}>
                                    <div>
                                        {isNewPage
                                            ? 'Suggested'
                                            : 'Link To Page'}
                                    </div>
                                    <DoubleLinkMenuContainer
                                        editor={editor}
                                        hooks={hooks}
                                        style={style}
                                        isShow={true}
                                        blockId={blockId}
                                        onSelected={handleSelected}
                                        onClose={handleClose}
                                        items={items}
                                        types={searchBlockIds.concat([
                                            ADD_NEW_SUB_PAGE,
                                            ADD_NEW_PAGE,
                                        ])}
                                    />
                                </DoubleLinkMenuWrapper>
                            </Paper>
                        </Grow>
                    )}
                </Popper>
            </MuiClickAwayListener>
        </div>
    );
};

const DoubleLinkMenuWrapper = styled('div')({
    zIndex: 1,
});
