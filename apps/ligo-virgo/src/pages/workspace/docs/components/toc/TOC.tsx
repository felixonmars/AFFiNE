import { BlockEditor } from '@toeverything/components/editor-core';
import { styled } from '@toeverything/components/ui';
import type { ReactNode } from 'react';
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react';
import { useParams } from 'react-router';
import {
    BLOCK_TYPES,
    getContentByAsyncBlocks,
    getPageTOC,
} from '../../utils/toc';

const StyledTOCItem = styled('a')<{ type?: string; isActive?: boolean }>(
    ({ type, isActive }) => {
        const common = {
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            color: isActive ? '#3E6FDB' : '#4C6275',
        };

        if (type === BLOCK_TYPES.HEADING1) {
            return {
                ...common,
                padding: '0 12px',
                fontWeight: '600',
                fontSize: '16px',
            };
        }

        if (type === BLOCK_TYPES.HEADING2) {
            return {
                ...common,
                padding: '0 32px',
                fontSize: '14px',
            };
        }

        if (type === BLOCK_TYPES.HEADING3) {
            return {
                ...common,
                padding: '0 52px',
                fontSize: '12px',
            };
        }

        if (type === BLOCK_TYPES.GROUP) {
            return {
                ...common,
                margin: '6px 0px',
                height: '46px',
                padding: '6px 12px',
                fontWeight: '600',
                fontSize: '16px',
                borderTop: '0.5px solid #E0E6EB',
                borderBottom: '0.5px solid #E0E6EB',
                color: isActive ? '#3E6FDB' : '#98ACBD',
            };
        }

        return {};
    }
);

const StyledItem = styled('div')(props => {
    return {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    };
});

const TOCContext = createContext(null);

interface Props {
    children: ReactNode;
    editor: BlockEditor;
}

const TOCItem = props => {
    const { activeBlockId, onClick } = useContext(TOCContext);
    const { id, type, text } = props;
    const isActive = id === activeBlockId;

    return (
        <StyledTOCItem
            key={id}
            isActive={isActive}
            type={type}
            onClick={() => onClick(id)}
        >
            <StyledItem>{text}</StyledItem>
        </StyledTOCItem>
    );
};

const renderTOCContent = tocDataSource => {
    return (
        <>
            {tocDataSource.map(tocItem => {
                if (tocItem?.length) {
                    return renderTOCContent(tocItem);
                }

                const { id, type, text } = tocItem;

                return <TOCItem key={id} id={id} type={type} text={text} />;
            })}
        </>
    );
};

export const Toc = (props: Props) => {
    const { editor } = props;
    const { page_id } = useParams();
    const [tocDataSource, setTocDataSource] = useState([]);
    const [activeBlockId, setActiveBlockId] = useState('blockId');

    const updateTocDataSource = useCallback(async () => {
        const { children = [] } =
            (await editor.queryByPageId(page_id))?.[0] || {};
        const asyncBlocks = (await editor.getBlockByIds(children)) || [];
        const tocDataSource = getPageTOC(
            asyncBlocks,
            await getContentByAsyncBlocks(asyncBlocks, updateTocDataSource)
        );

        setTocDataSource(tocDataSource);
    }, [editor, page_id]);

    useEffect(() => {
        (async () => {
            await updateTocDataSource();
        })();
    }, [updateTocDataSource]);

    const onClick = async (blockId?: string) => {
        if (blockId === activeBlockId) {
            return;
        }

        setActiveBlockId(blockId);
        await editor.scrollManager.scrollIntoViewByBlockId(blockId);
    };

    return (
        <TOCContext.Provider value={{ activeBlockId, onClick }}>
            <div>{renderTOCContent(tocDataSource)}</div>
        </TOCContext.Provider>
    );
};