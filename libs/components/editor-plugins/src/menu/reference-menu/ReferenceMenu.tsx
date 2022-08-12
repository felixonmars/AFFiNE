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

import { ReferenceMenuContainer } from './Container';
import { QueryBlocks, QueryResult } from '../../search';

export type ReferenceMenuProps = {
    editor: Virgo;
    hooks: PluginHooks;
    style?: { left: number; top: number };
};

export type RefLinkComponent = {
    type: 'reflink';
    reference: string;
};

type ReferenceMenuStyle = {
    left: number;
    top: number;
    height: number;
};

export const ReferenceMenu = ({ editor, hooks, style }: ReferenceMenuProps) => {
    const [isShow, setIsShow] = useState(false);
    const [blockId, setBlockId] = useState<string>();
    const [searchText, setSearchText] = useState<string>('');
    const [searchBlocks, setSearchBlocks] = useState<QueryResult>([]);
    const [anchorEl, setAnchorEl] = useState(null);
    const ref = useRef();
    const [referenceMenuStyle, setReferenceMenuStyle] =
        useState<ReferenceMenuStyle>({
            left: 0,
            top: 0,
            height: 0,
        });

    useEffect(() => {
        QueryBlocks(editor, searchText, result => setSearchBlocks(result));
    }, [editor, searchText]);

    const searchBlockIds = useMemo(
        () => Object.values(searchBlocks).map(({ id }) => id),
        [searchBlocks]
    );

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

                if (isShow) {
                    setSearchText('G');
                }

                if (text.endsWith('[[')) {
                    if (event.key === 'Backspace') {
                        setIsShow(false);
                        return;
                    }
                    setIsShow(true);

                    setBlockId(anchorNode.id);
                    setSearchText(' ');

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
        },
        [editor, isShow]
    );

    const handleKeyup = useCallback(
        (event: React.KeyboardEvent<HTMLDivElement>) => handleSearch(event),
        [handleSearch]
    );

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLDivElement>) => {
            if (event.code === 'Escape') {
                setIsShow(false);
            }
        },
        []
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

    const handleSelected = async (reference: string) => {
        if (blockId) {
            const { anchorNode } = editor.selection.currentSelectInfo;
            editor.blockHelper.insertReference(
                reference,
                anchorNode.id,
                editor.selection.currentSelectInfo?.browserSelection,
                -searchText.length - 2
            );
        }

        setIsShow(false);
    };

    const handleClose = () => {
        blockId && editor.blockHelper.removeSearchSlash(blockId);
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
            <MuiClickAwayListener onClickAway={() => setIsShow(false)}>
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
                                <ReferenceMenuWrapper onKeyUp={handleKeyup}>
                                    <ReferenceMenuContainer
                                        editor={editor}
                                        hooks={hooks}
                                        style={style}
                                        isShow={true}
                                        blockId={blockId}
                                        onSelected={handleSelected}
                                        onClose={handleClose}
                                        searchBlocks={searchBlocks}
                                        types={searchBlockIds}
                                    />
                                </ReferenceMenuWrapper>
                            </Paper>
                        </Grow>
                    )}
                </Popper>
            </MuiClickAwayListener>
        </div>
    );
};

const ReferenceMenuWrapper = styled('div')({
    zIndex: 1,
});
