import Content from "./pagination-content.svelte";
import Ellipsis from "./pagination-ellipsis.svelte";
import Item from "./pagination-item.svelte";
import Link from "./pagination-link.svelte";
import NextButton from "./pagination-next-button.svelte";
import Next from "./pagination-next.svelte";
import PrevButton from "./pagination-prev-button.svelte";
import Previous from "./pagination-previous.svelte";
import Root from "./pagination.svelte";

export {
  Root,
  Content,
  Item,
  Link,
  // old
  PrevButton,
  // old
  NextButton,
  Ellipsis,
  Previous,
  Next,
  //
  Root as Pagination,
  Content as PaginationContent,
  Item as PaginationItem,
  Link as PaginationLink,
  // old
  PrevButton as PaginationPrevButton,
  // old
  NextButton as PaginationNextButton,
  Ellipsis as PaginationEllipsis,
  Previous as PaginationPrevious,
  Next as PaginationNext,
};
