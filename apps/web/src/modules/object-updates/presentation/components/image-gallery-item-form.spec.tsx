/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import { imageEditorConfigForUpdateType } from '../../application/image-editor-config';
import { fetchImageForEditor } from '@/modules/object-create/infrastructure/actions/fetch-image-for-editor.action';
import { uploadImageToIpfs } from '@/modules/object-create/infrastructure/actions/upload-image.action';
import { uploadImageFromUrl } from '@/modules/object-create/infrastructure/actions/upload-image-from-url.action';

import { ImageCidOrUrlForm } from './image-cid-or-url-form';
import { ImageGalleryItemForm } from './image-gallery-item-form';

jest.mock('@/i18n/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: 'en-US',
  }),
}));

jest.mock('@/shared/presentation', () => {
  const { IpfsImageDropZone } = jest.requireActual(
    '@/shared/presentation/components/ipfs-image-drop-zone',
  );
  return { IpfsImageDropZone };
});

jest.mock(
  '@/modules/object-create/infrastructure/actions/fetch-image-for-editor.action',
  () => ({
    fetchImageForEditor: jest.fn(),
  }),
);

jest.mock('@/modules/object-create/infrastructure/actions/upload-image.action', () => ({
  uploadImageToIpfs: jest.fn(),
}));

jest.mock(
  '@/modules/object-create/infrastructure/actions/upload-image-from-url.action',
  () => ({
    uploadImageFromUrl: jest.fn(),
  }),
);

const fetchImageForEditorMock = jest.mocked(fetchImageForEditor);
const uploadImageToIpfsMock = jest.mocked(uploadImageToIpfs);
const uploadImageFromUrlMock = jest.mocked(uploadImageFromUrl);

const YOUTUBE = 'https://www.youtube.com/watch?v=abcdefghijk';
const VIMEO = 'https://vimeo.com/123456789/a1b2c3d4';
const THREE_SPEAK = 'https://3speak.tv/watch?v=author%2Fmy-post-permlink';
const DTUBE = 'https://d.tube/v/alice/my-video';
const PHOTO = 'https://cdn.example.com/photo.jpg';

function pasteUrl(url: string) {
  const zone = screen.getByRole('button', { name: 'object_create_image_zone_title' });
  fireEvent.paste(zone, {
    clipboardData: {
      getData: (type: string) => (type === 'text/plain' ? url : ''),
      items: [],
    },
  });
}

function renderGallery(onChange = jest.fn(), value?: Record<string, unknown>) {
  render(
    <ImageGalleryItemForm
      value={value ?? { album: 'Videos', url: '', cid: '' }}
      onChange={onChange}
      albumNames={['Videos']}
      lockAlbum
    />,
  );
  return onChange;
}

describe('ImageGalleryItemForm video share links', () => {
  beforeEach(() => {
    fetchImageForEditorMock.mockReset();
    fetchImageForEditorMock.mockRejectedValue(new Error('importer down'));
    uploadImageToIpfsMock.mockReset();
    uploadImageFromUrlMock.mockReset();
  });

  it('stores a YouTube share link as url only and previews the poster', () => {
    const onChange = renderGallery();
    pasteUrl(YOUTUBE);

    expect(onChange).toHaveBeenCalledWith({ album: 'Videos', url: YOUTUBE });
    expect(onChange.mock.calls.at(-1)?.[0]).not.toHaveProperty('cid');
    expect(document.querySelector('img')?.getAttribute('src')).toBe(
      'https://img.youtube.com/vi/abcdefghijk/hqdefault.jpg',
    );
    expect(document.querySelector(`img[src="${YOUTUBE}"]`)).toBeNull();
    expect(document.querySelector('iframe')).toBeNull();
    expect(fetchImageForEditorMock).not.toHaveBeenCalled();
    expect(uploadImageToIpfsMock).not.toHaveBeenCalled();
    expect(uploadImageFromUrlMock).not.toHaveBeenCalled();
  });

  it('stores a Vimeo share link as url only', () => {
    const onChange = renderGallery();
    pasteUrl(VIMEO);

    expect(onChange).toHaveBeenCalledWith({ album: 'Videos', url: VIMEO });
    expect(onChange.mock.calls.at(-1)?.[0]).not.toHaveProperty('cid');
    expect(document.querySelector('iframe')).toBeNull();
    expect(fetchImageForEditorMock).not.toHaveBeenCalled();
    expect(uploadImageToIpfsMock).not.toHaveBeenCalled();
  });

  it('stores a 3Speak share link as url only', () => {
    const onChange = renderGallery();
    pasteUrl(THREE_SPEAK);

    expect(onChange).toHaveBeenCalledWith({ album: 'Videos', url: THREE_SPEAK });
    expect(onChange.mock.calls.at(-1)?.[0]).not.toHaveProperty('cid');
    expect(fetchImageForEditorMock).not.toHaveBeenCalled();
  });

  it('stores a DTube share link as url only', () => {
    const onChange = renderGallery();
    pasteUrl(DTUBE);

    expect(onChange).toHaveBeenCalledWith({ album: 'Videos', url: DTUBE });
    expect(onChange.mock.calls.at(-1)?.[0]).not.toHaveProperty('cid');
    expect(fetchImageForEditorMock).not.toHaveBeenCalled();
  });

  it('keeps a video paste when the image importer would fail', () => {
    const onChange = renderGallery();
    pasteUrl(YOUTUBE);

    expect(onChange).toHaveBeenCalledWith({ album: 'Videos', url: YOUTUBE });
    expect(document.querySelector('img')?.getAttribute('src')).toBe(
      'https://img.youtube.com/vi/abcdefghijk/hqdefault.jpg',
    );
    expect(screen.queryByRole('alert')).toBeNull();
    expect(fetchImageForEditorMock).not.toHaveBeenCalled();
    expect(uploadImageToIpfsMock).not.toHaveBeenCalled();
  });

  it('still imports a non-video URL on a gallery item', async () => {
    fetchImageForEditorMock.mockResolvedValue({ error: 'not_image' });
    const onChange = renderGallery();
    pasteUrl(PHOTO);

    await waitFor(() => {
      expect(fetchImageForEditorMock).toHaveBeenCalledWith(PHOTO, '');
    });
    expect(document.querySelector('iframe')).toBeNull();
    expect(onChange).not.toHaveBeenCalledWith(expect.objectContaining({ url: PHOTO }));
    expect(uploadImageToIpfsMock).not.toHaveBeenCalled();
  });

  it('pasting the same video link twice stays a single url', () => {
    const onChange = jest.fn();
    const { rerender } = render(
      <ImageGalleryItemForm
        value={{ album: 'Videos', url: '', cid: '' }}
        onChange={onChange}
        albumNames={['Videos']}
        lockAlbum
      />,
    );
    pasteUrl(YOUTUBE);
    rerender(
      <ImageGalleryItemForm
        value={{ album: 'Videos', url: YOUTUBE }}
        onChange={onChange}
        albumNames={['Videos']}
        lockAlbum
      />,
    );
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    fireEvent.paste(document, {
      clipboardData: {
        getData: (type: string) => (type === 'text/plain' ? YOUTUBE : ''),
        items: [],
      },
    });

    const calls = onChange.mock.calls.map((call) => call[0]);
    expect(calls.every((value) => value.cid === undefined && value.url === YOUTUBE)).toBe(
      true,
    );
    expect(fetchImageForEditorMock).not.toHaveBeenCalled();
    expect(uploadImageToIpfsMock).not.toHaveBeenCalled();
    expect(uploadImageFromUrlMock).not.toHaveBeenCalled();
  });
});

describe('avatar and background image forms', () => {
  beforeEach(() => {
    fetchImageForEditorMock.mockReset();
    fetchImageForEditorMock.mockResolvedValue({ error: 'not_image' });
    uploadImageToIpfsMock.mockReset();
    uploadImageFromUrlMock.mockReset();
  });

  it.each([UPDATE_TYPES.IMAGE, UPDATE_TYPES.IMAGE_BACKGROUND])(
    'keeps %s pastes on the image importer',
    async (updateType) => {
      const onChange = jest.fn();
      render(
        <ImageCidOrUrlForm
          value={{}}
          onChange={onChange}
          label="object_create_image_zone_title"
          editorConfig={imageEditorConfigForUpdateType(updateType)}
        />,
      );
      pasteUrl(YOUTUBE);

      await waitFor(() => {
        expect(fetchImageForEditorMock).toHaveBeenCalledWith(YOUTUBE, '');
      });
      expect(onChange).not.toHaveBeenCalledWith({ url: YOUTUBE });
      expect(document.querySelector('iframe')).toBeNull();
      expect(uploadImageToIpfsMock).not.toHaveBeenCalled();
    },
  );
});
