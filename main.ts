enum Direction { LEFT = 'left', RIGHT = 'right' };

interface CarouselParams {
    containerId: string,
    animationDuration: number,
    autoPlay: boolean,
    autoPlayDuration: number
}

class Carousel {
    carouselContainerId:string;
    carouselContainerDom:HTMLElement;
    totalSlideCount:number;
    activeSlideCount:number = 1;
    readonly carouselWidth:number;
    readonly animationDuration:number;
    isTransitioning:boolean = false;
    autoPlay:boolean = false;
    autoPlatDuration:number;
    autoPlayInterval:number;
    constructor({
      containerId: carouselContainerId,
      animationDuration,
      autoPlay,
      autoPlayDuration = 0,
    }: CarouselParams) {
        this.carouselContainerId = carouselContainerId;
        this.carouselContainerDom = document.getElementById(carouselContainerId) as HTMLElement;
        this.carouselWidth = this.carouselContainerDom.clientWidth;
        this.animationDuration = animationDuration;
        this.totalSlideCount = document.querySelector(`#${carouselContainerId} .carousel-items`).childElementCount;
        this.autoPlay = autoPlay;
        this.autoPlatDuration = autoPlayDuration;
        this.translateForCurrentSlide();
        this.initializeNavigators();
        this.cloneFirstAndLastSlide();
        this.attachDraggingEvents();
        this.startAutoPlay();
        document.styleSheets[0].insertRule(`#carousel .carousel-items.transitioning { transition: all ${animationDuration}ms cubic-bezier(.7,0,0,1); }`, 0);
    }

    startAutoPlay(): void {
        if(this.autoPlay) {
            this.autoPlayInterval = setInterval(() => this.next(), this.autoPlatDuration);
        }
    }

    clearAutoPlay(): void {
        if(this.autoPlay) {
            clearInterval(this.autoPlayInterval);
        }
    }

    attachDraggingEvents(): void {
        const carouselItemsContainer:HTMLElement = document.querySelector(`#${this.carouselContainerId} .carousel-items`);
        let initialPosition:number;
        let currentPosition:number;
        let currentCarouselTranslate:number;

        const getClientXFromEvent = (e:MouseEvent | TouchEvent): number => {
            if(e instanceof MouseEvent) return e.clientX;
            else if(e instanceof TouchEvent) return e.touches[0].clientX;
        }

        const handleMouseMoveEvent = (e:MouseEvent | TouchEvent): void => {
            currentPosition = getClientXFromEvent(e);
            const relativePosition:number = currentPosition - initialPosition;
            carouselItemsContainer.style.translate = `${currentCarouselTranslate + relativePosition}px 0`;

            if(e instanceof TouchEvent) {
                const touch:Touch = e.touches[0];
                const elementAtPosition:HTMLElement = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement;
                const isTouchOut = !elementAtPosition.parentElement.classList.contains('carousel-items');
                if(isTouchOut) {
                    handleMouseUpEvent(e);
                }
            }
        }
        
        const handleMouseDownEvent = (e:MouseEvent | TouchEvent): void => {
            if(this.isTransitioning) return;

            this.clearAutoPlay();

            initialPosition = getClientXFromEvent(e);
            currentCarouselTranslate = parseInt(carouselItemsContainer.style.translate, 10);
            carouselItemsContainer.addEventListener('mousemove', handleMouseMoveEvent);
            carouselItemsContainer.addEventListener('mouseleave', handleMouseUpEvent);
            carouselItemsContainer.addEventListener('mouseup', handleMouseUpEvent);
            carouselItemsContainer.addEventListener('touchmove', handleMouseMoveEvent);
            carouselItemsContainer.addEventListener('touchend', handleMouseUpEvent);
        }
        
        const handleMouseUpEvent = (e:MouseEvent | TouchEvent): void => {
            carouselItemsContainer.removeEventListener('mousemove', handleMouseMoveEvent);
            carouselItemsContainer.removeEventListener('mouseleave', handleMouseUpEvent);
            carouselItemsContainer.removeEventListener('mouseup', handleMouseUpEvent);
            carouselItemsContainer.removeEventListener('touchmove', handleMouseMoveEvent);
            carouselItemsContainer.removeEventListener('touchend', handleMouseUpEvent);

            const relativePosition:number = currentPosition - initialPosition;

            if(relativePosition > (0.1*this.carouselWidth)) this.previous();
            else if(relativePosition  < (-1*0.1*this.carouselWidth)) this.next();
            else this.transition();
        }

        carouselItemsContainer.addEventListener('mousedown', handleMouseDownEvent);
        carouselItemsContainer.addEventListener('touchstart', handleMouseDownEvent);
    }

    cloneFirstAndLastSlide(): void {
        const carouselItemsContainer:HTMLElement = document.querySelector(`#${this.carouselContainerId} .carousel-items`);

        const lastElement:HTMLElement = carouselItemsContainer.lastElementChild as HTMLElement;
        const clonedLastElement:HTMLElement = lastElement.cloneNode(true) as HTMLElement;

        const firstElement:HTMLElement = carouselItemsContainer.firstElementChild as HTMLElement;
        const clonedFirstElement:HTMLElement = firstElement.cloneNode(true) as HTMLElement;

        carouselItemsContainer.prepend(clonedLastElement);
        carouselItemsContainer.appendChild(clonedFirstElement);
    }

    getNavigatorIconDom(direction:Direction): HTMLElement {
        const iconContainerDom:HTMLElement = document.createElement('span');
        const eventName:string = direction === Direction.LEFT ? 'previous' : 'next';
        iconContainerDom.addEventListener('click', () => this[eventName]());

        const arrowIconDom:HTMLElement = document.createElement('i');
        arrowIconDom.setAttribute('data-feather', `arrow-${direction}`);

        iconContainerDom.appendChild(arrowIconDom);
        return iconContainerDom;
    }

    initializeNavigators(): void {
        const navigatorContainerDom:HTMLElement = document.createElement('div');
        navigatorContainerDom.classList.add('navigator-container');

        const leftArrowIconDom:HTMLElement = this.getNavigatorIconDom(Direction.LEFT);
        const rightArrowIconDom:HTMLElement = this.getNavigatorIconDom(Direction.RIGHT);

        navigatorContainerDom.appendChild(leftArrowIconDom);
        navigatorContainerDom.appendChild(rightArrowIconDom);
        this.carouselContainerDom.appendChild(navigatorContainerDom);
    }

    next(): void {
        if(this.isTransitioning) return;

        this.activeSlideCount++;
        this.transition();
    }

    previous(): void {
        if(this.isTransitioning) return;

        this.activeSlideCount--;
        this.transition();
    }

    transition(): void {
        this.clearAutoPlay();
        const carouselItemsContainer:HTMLElement = document.querySelector(`#${this.carouselContainerId} .carousel-items`);
        carouselItemsContainer.classList.add('transitioning');
        this.isTransitioning = true;
        this.translateForCurrentSlide();

        setTimeout(() => {
            carouselItemsContainer.classList.remove('transitioning');
            this.isTransitioning = false;
            if(this.activeSlideCount < 1) {
                this.activeSlideCount = this.totalSlideCount;
                this.translateForCurrentSlide();
            } else if(this.activeSlideCount > this.totalSlideCount) {
                this.activeSlideCount = 1;
                this.translateForCurrentSlide();
            }
            this.startAutoPlay();
        }, this.animationDuration);
    }

    translateForCurrentSlide(): void {
        const carouselItemsContainer:HTMLElement = document.querySelector(`#${this.carouselContainerId} .carousel-items`);
        const width:number = this.carouselWidth;
        const translate:number = (-1) * width * this.activeSlideCount;
        carouselItemsContainer.style.translate = `${translate}px 0`;
    }
}